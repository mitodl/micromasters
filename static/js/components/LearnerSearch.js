// @flow
/* global SETTINGS: false */
import React from 'react';
import {
  SearchkitComponent,
  HierarchicalMenuFilter,
  Hits,
  SelectedFilters,
  HierarchicalRefinementFilter,
  RefinementListFilter,
  HitsStats,
  Pagination,
  ResetFilters,
  RangeFilter,
  SearchBox,
  SortingSelector,
  MultiMatchQuery,
} from 'searchkit';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import Card from 'react-mdl/lib/Card/Card';
import iso3166 from 'iso-3166-2';
import R from 'ramda';
import _ from 'lodash';

import ProgramFilter from './ProgramFilter';
import LearnerResult from './search/LearnerResult';
import CountryRefinementOption from './search/CountryRefinementOption';
import PatchedMenuFilter from './search/PatchedMenuFilter';
import WorkHistoryFilter from './search/WorkHistoryFilter';
import CustomPaginationDisplay from './search/CustomPaginationDisplay';
import CustomResetFiltersDisplay from './search/CustomResetFiltersDisplay';
import CustomSortingColumnHeaders from './search/CustomSortingColumnHeaders';
import FilterVisibilityToggle from './search/FilterVisibilityToggle';
import HitsCount from './search/HitsCount';
import CustomNoHits from './search/CustomNoHits';
import { EDUCATION_LEVELS } from '../constants';
import { wrapWithProps } from '../util/util';
import type { Option } from '../flow/generalTypes';
import type { AvailableProgram } from '../flow/enrollmentTypes';
import type { SearchSortItem } from '../flow/searchTypes';
import type { Profile } from '../flow/profileTypes';
import FinalGradeRangeFilter  from './search/FinalGradeRangeFilter';

const makeCountryNameTranslations: () => Object = () => {
  let translations = {};
  for (let code of Object.keys(iso3166.data)) {
    translations[code] = iso3166.data[code].name;
    for (let stateCode of Object.keys(iso3166.data[code].sub)) {
      translations[stateCode] = iso3166.data[code].sub[stateCode].name;
    }
  }
  return translations;
};

const makeDegreeTranslations: () => Object = () => {
  let translations = {};
  for(let level of EDUCATION_LEVELS) {
    translations[level.value] = level.label;
  }
  return translations;
};

const SEMESTER_SEASON_NUMBER_VALUE = {
  'Spring': '1',
  'Summer': '2',
  'Fall': '3'
};

// Produces a descending date-ordered list from bucket values like '2016 - Fall'
const sortSemesterBuckets = R.compose(
  R.reverse,
  R.sortBy(
    // '2016 - Fall' -> '20163', '2016 - Spring' -> '20161'
    R.compose(
      yearSeasonArr => `${yearSeasonArr[0]}${SEMESTER_SEASON_NUMBER_VALUE[yearSeasonArr[1]]}`,
      R.split(/[^\w]+/),
      R.prop('key')
    ))
);

export const sortOptions: Array<SearchSortItem> = [
  {
    label: "Last Name A-Z", key: "name_a_z", fields: [
      { field: "profile.last_name", options: { order: "asc" } },
      { field: "profile.first_name", options: { order: "asc" } }
    ]
  },
  {
    label: "Last Name Z-A", key: "name_z_a", fields: [
      { field: "profile.last_name", options: { order: "desc" } },
      { field: "profile.first_name", options: { order: "desc" } }
    ]
  },
  {
    label: "Grade High-to-low", field: "program.grade_average",
    order: "desc", key: "grade-high-low"
  },
  {
    label: "Grade Low-to-High", field: "program.grade_average",
    order: "asc" , key: "grade-low-high"
  },
  {
    label: "Country A-Z", key: "loc-a-z", fields: [
      { field: "profile.country", options: { order: "asc" } },
      { field: "profile.city", options: { order: "asc" } },
    ]
  },
  {
    label: "Country Z-A", key: "loc-z-a", fields: [
      { field: "profile.country", options: { order: "desc" } },
      { field: "profile.city", options: { order: "desc" } },
    ]
  },
];

export default class LearnerSearch extends SearchkitComponent {
  props: {
    checkFilterVisibility:          (s: string) => boolean,
    setFilterVisibility:            (s: string, v: boolean) => void,
    openSearchResultEmailComposer:  (searchkit: Object) => void,
    openLearnerEmailComposer:       (profile: Profile) => void,
    children:                       React$Element<*>[],
    currentProgramEnrollment:       AvailableProgram,
  };

  dropdownOptions: Option[] = [
    { value: 'name', label: "Sort: name" },
    { value: 'dob', label: "Sort: dob" },
  ];

  countryNameTranslations: Object = makeCountryNameTranslations();
  degreeTranslations: Object = makeDegreeTranslations();

  constructor(props: Object) {
    super(props);
    this.WrappedLearnerResult = wrapWithProps(
      {openLearnerEmailComposer: this.props.openLearnerEmailComposer},
      LearnerResult
    );
  }

  getNumberOfCoursesInProgram = (): number => {
    let results = this.getResults();
    if (!results) {
      return 0;
    }

    const hit = (
       results.hits && results.hits.hits && results.hits.hits.length > 0 ? results.hits.hits[0] : null
    );
    return hit !== null ? hit._source.program.total_courses : 0;
  };

  renderSearchHeader = (): React$Element<*>|null => {
    const { openSearchResultEmailComposer } = this.props;

    if (_.isNull(this.getResults())) {
      return null;
    }

    return (
      <Grid noSpacing={true} className="search-header">
        <Cell col={6} className="result-info">
          <button
            id="email-selected"
            className="mdl-button minor-action"
            onClick={R.partial(openSearchResultEmailComposer, [this.searchkit])}
          >
            Email These Learners
          </button>
          <HitsStats component={HitsCount} />
        </Cell>
        <Cell col={6} className="pagination-search">
          <SearchBox
            queryBuilder={MultiMatchQuery}
            searchOnChange={true}
            queryFields={[
              'profile.first_name.folded',
              'profile.last_name.folded',
              'profile.preferred_name.folded',
              'profile.username.folded',
              'profile.full_name.folded',
              'email.folded'
            ]}
            queryOptions={{
              analyzer: "folding",
              type: "phrase_prefix",
            }}
          />
          <Pagination showText={false} listComponent={CustomPaginationDisplay} />
        </Cell>
        <Cell col={12} className="mm-filters">
          <SelectedFilters />
          <ResetFilters component={CustomResetFiltersDisplay} />
        </Cell>
        <Cell col={12} className="sorting-header">
          <SortingSelector options={sortOptions} listComponent={CustomSortingColumnHeaders} />
        </Cell>
      </Grid>
    );
  };

  renderFacets = (currentProgram: AvailableProgram): React$Element<*> => {
    if (_.isNull(this.getResults())) {
      return (
        <Card className="fullwidth" shadow={1}>
          <div className="no-hits left-nav">
            {`There are no users in the ${currentProgram.title} program.`}
          </div>
        </Card>
      );
    }

    return (
      <Card className="fullwidth" shadow={1}>
        <FilterVisibilityToggle
          {...this.props}
          title="Course"
          filterName="courses"
        >
          <HierarchicalRefinementFilter
            field={"program.enrollments"}
            title=""
            id="courses"
          />
        </FilterVisibilityToggle>
        <div className="final-grade-wrapper">
          <FinalGradeRangeFilter
            field="program.final_grades.grade"
            id="final-grade"
            min={0}
            max={100}
            showHistogram={true}
            title="Final Grade in Selected Course"
          />
        </div>
        <FilterVisibilityToggle
          {...this.props}
          filterName="semester"
          title="Semester"
        >
          <PatchedMenuFilter
            field="program.semester_enrollments.semester"
            fieldOptions={{ type: 'nested', options: {path: 'program.semester_enrollments'} }}
            title=""
            id="semester"
            bucketsTransform={sortSemesterBuckets}
          />
        </FilterVisibilityToggle>
        <FilterVisibilityToggle
          {...this.props}
          filterName="num-courses-passed"
          title="# of Courses Passed"
        >
          <RangeFilter
            field="program.num_courses_passed"
            id="num-courses-passed"
            min={0}
            max={this.getNumberOfCoursesInProgram()}
            showHistogram={false}
            title="" />
        </FilterVisibilityToggle>
        <FilterVisibilityToggle
          {...this.props}
          filterName="grade-average"
          title="Average Grade in Program"
        >
          <RangeFilter
            field="program.grade_average"
            id="grade-average"
            min={0}
            max={100}
            showHistogram={true}
            title=""
          />
        </FilterVisibilityToggle>
        <FilterVisibilityToggle
          {...this.props}
          filterName="birth-location"
          title="Country of Birth"
        >
          <RefinementListFilter
            id="birth_location"
            title=""
            field="profile.birth_country"
            operator="OR"
            itemComponent={CountryRefinementOption}
            size={15}
          />
        </FilterVisibilityToggle>
        <FilterVisibilityToggle
          {...this.props}
          title="Current Residence"
          filterName="residence-country"
        >
          <HierarchicalMenuFilter
            fields={["profile.country", "profile.state_or_territory"]}
            title=""
            id="country"
            translations={this.countryNameTranslations}
            size={0}
          />
        </FilterVisibilityToggle>
        <FilterVisibilityToggle
          {...this.props}
          title="Degree"
          filterName="education-level"
        >
          <PatchedMenuFilter
            id="education_level"
            title=""
            field="profile.education.degree_name"
            fieldOptions={{type: 'nested', options: { path: 'profile.education' } }}
            translations={this.degreeTranslations}
          />
        </FilterVisibilityToggle>
        <FilterVisibilityToggle
          {...this.props}
          filterName="company-name"
          title="Company"
        >
          <WorkHistoryFilter id="company_name" />
        </FilterVisibilityToggle>

      </Card>
    );
  };

  render () {
    const { currentProgramEnrollment } = this.props;

    return (
      <div className="learners-search">
        <ProgramFilter
          currentProgramEnrollment={currentProgramEnrollment}
        />
        <Grid className="search-grid">
          <Cell col={3} className="search-sidebar">
            { this.renderFacets(currentProgramEnrollment) }
          </Cell>
          <Cell col={9}>
            <Card className="fullwidth results-padding" shadow={1}>
              { this.renderSearchHeader() }
              <Hits
                className="learner-results"
                hitsPerPage={SETTINGS.es_page_size}
                itemComponent={this.WrappedLearnerResult}
              />
              <CustomNoHits />
            </Card>
          </Cell>
        </Grid>
      </div>
    );
  }
}
