// @flow
import React from 'react';
import {
  SearchkitComponent,
  HierarchicalMenuFilter,
  Hits,
  SelectedFilters,
  RefinementListFilter,
  HitsStats,
  Pagination,
  ResetFilters,
  RangeFilter,
  SortingSelector,
} from 'searchkit';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import Card from 'react-mdl/lib/Card/Card';
import iso3166 from 'iso-3166-2';
import { StickyContainer, Sticky } from 'react-sticky';
import _ from 'lodash';

import ProgramFilter from './ProgramFilter';
import LearnerResult from './search/LearnerResult';
import CountryRefinementOption from './search/CountryRefinementOption';
import CustomPaginationDisplay from './search/CustomPaginationDisplay';
import CustomResetFiltersDisplay from './search/CustomResetFiltersDisplay';
import CustomSortingSelect from './search/CustomSortingSelect';
import FilterVisibilityToggle from './search/FilterVisibilityToggle';
import HitsCount from './search/HitsCount';
import CustomNoHits from './search/CustomNoHits';
import EmailCompositionDialog from './EmailCompositionDialog';
import type { Option } from '../flow/generalTypes';
import type { Email } from '../flow/emailTypes';
import type { ProgramEnrollment } from '../flow/enrollmentTypes';

let makeSearchkitTranslations: () => Object = () => {
  let translations = {};
  for (let code of Object.keys(iso3166.data)) {
    translations[code] = iso3166.data[code].name;
    for (let stateCode of Object.keys(iso3166.data[code].sub)) {
      translations[stateCode] = iso3166.data[code].sub[stateCode].name;
    }
  }

  return translations;
};

const sortOptions = [
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
    checkFilterVisibility:    (s: string) => boolean,
    setFilterVisibility:      (s: string, v: boolean) => void,
    openEmailComposer:        () => void,
    emailDialogVisibility:    boolean,
    closeEmailDialog:         () => void,
    updateEmailEdit:          (o: Object) => void,
    sendEmail:                () => void,
    email:                    Email,
    children:                 React$Element<*>[],
    currentProgramEnrollment: ProgramEnrollment,
  };

  dropdownOptions: Option[] = [
    { value: 'name', label: "Sort: name" },
    { value: 'dob', label: "Sort: dob" },
  ];

  searchkitTranslations: Object = makeSearchkitTranslations();

  renderSearchHeader: Function = (openEmailComposer: Function): React$Element<*>|null => {
    if (_.isNull(this.getResults())) {
      return null;
    }

    return (
      <Grid className="search-header">
        <Cell col={6} className="result-info">
          <button
            id="email-selected"
            className="mdl-button minor-action"
            onClick={() => openEmailComposer(this.searchkit)}
          >
            Email These Learners
          </button>
          <HitsStats component={HitsCount} />
        </Cell>
        <Cell col={2} />
        <Cell col={4} className="pagination-sort">
          <SortingSelector options={sortOptions} listComponent={CustomSortingSelect} />
          <Pagination showText={false} listComponent={CustomPaginationDisplay} />
        </Cell>
        <Cell col={12} className="mm-filters">
          <SelectedFilters />
          <ResetFilters component={CustomResetFiltersDisplay}/>
        </Cell>
      </Grid>
    );
  }

  renderFacets: Function = (currentProgramEnrollment: ProgramEnrollment): React$Element<*> => {
    if (_.isNull(this.getResults())) {
      return (
        <Card className="fullwidth" shadow={1}>
          <div className="no-hits left-nav">
            {`There are no users in the ${currentProgramEnrollment.title} program.`}
          </div>
        </Card>
      );
    }

    return (
      <Sticky>
        <Card className="fullwidth" shadow={1}>
          <FilterVisibilityToggle
            {...this.props}
            filterName="birth-location"
          >
            <RefinementListFilter
              id="birth_location"
              title="Country of Birth"
              field="profile.birth_country"
              operator="OR"
              itemComponent={CountryRefinementOption}
            />
          </FilterVisibilityToggle>
          <FilterVisibilityToggle
            {...this.props}
            filterName="residence-country"
          >
            <HierarchicalMenuFilter
              fields={["profile.country", "profile.state_or_territory"]}
              title="Current Residence"
              id="country"
              translations={this.searchkitTranslations}
            />
          </FilterVisibilityToggle>
          <FilterVisibilityToggle
            {...this.props}
            filterName="grade-average"
          >
            <RangeFilter
              field="program.grade_average"
              id="grade-average"
              min={0}
              max={100}
              showHistogram={true}
              title="Average Grade in Program"
            />
          </FilterVisibilityToggle>
        </Card>
      </Sticky>
    );
  }

  render () {
    const {
      emailDialogVisibility,
      closeEmailDialog,
      updateEmailEdit,
      sendEmail,
      email,
      openEmailComposer,
      currentProgramEnrollment,
    } = this.props;

    return (
      <div className="learners-search">
        <ProgramFilter
          currentProgramEnrollment={currentProgramEnrollment}
        />
        <EmailCompositionDialog
          open={emailDialogVisibility}
          closeEmailDialog={closeEmailDialog}
          updateEmailEdit={updateEmailEdit}
          email={email}
          sendEmail={sendEmail}
          searchkit={this.searchkit}
        />
        <StickyContainer>
          <Grid className="search-grid">
            <Cell col={3} className="search-sidebar">
              { this.renderFacets(currentProgramEnrollment) }
            </Cell>
            <Cell col={9}>
              <Card className="fullwidth results-padding" shadow={1}>
                { this.renderSearchHeader(openEmailComposer) }
                <Hits
                  className="learner-results"
                  hitsPerPage={50}
                  itemComponent={LearnerResult} />
                <CustomNoHits />
              </Card>
            </Cell>
          </Grid>
        </StickyContainer>
      </div>
    );
  }
}
