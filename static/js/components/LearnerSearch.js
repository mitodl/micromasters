// @flow
/* global SETTINGS: false */
import React from "react"
import {
  SearchkitComponent,
  HierarchicalMenuFilter,
  Hits,
  SelectedFilters,
  RefinementListFilter,
  HitsStats,
  Pagination,
  ResetFilters,
  SortingSelector,
  MultiMatchQuery
} from "searchkit"
import Grid from "@material-ui/core/Grid"
import Card from "@material-ui/core/Card"
import CardContent from "@material-ui/core/CardContent"
import iso3166 from "iso-3166-2"
import R from "ramda"
import _ from "lodash"

import Loader from "./Loader"
import ProgramFilter from "./ProgramFilter"
import LearnerResult from "./search/LearnerResult"
import CountryRefinementOption from "./search/CountryRefinementOption"
import MultiSelectCheckboxItemList from "./search/MultiSelectCheckboxItemList"
import CheckboxItem from "./search/CheckboxItem"
import EducationFilter from "./search/EducationFilter"
import NestedAggregatingMenuFilter from "./search/NestedAggregatingMenuFilter"
import WorkHistoryFilter from "./search/WorkHistoryFilter"
import CustomPaginationDisplay from "./search/CustomPaginationDisplay"
import CustomResetFiltersDisplay from "./search/CustomResetFiltersDisplay"
import CustomSortingColumnHeaders from "./search/CustomSortingColumnHeaders"
import FilterVisibilityToggle from "./search/FilterVisibilityToggle"
import HitsCount from "./search/HitsCount"
import CustomNoHits from "./search/CustomNoHits"
import ModifiedSelectedFilter from "./search/ModifiedSelectedFilter"
import FinalGradeRangeFilter from "./search/FinalGradeRangeFilter"
import EnabledSelectionRangeFilter from "./search/EnabledSelectionRangeFilter"
import CustomSearchBox from "./search/CustomSearchBox"
import { findObjByName, wrapWithProps } from "../util/util"
import type { Option } from "../flow/generalTypes"
import type { AvailableProgram } from "../flow/enrollmentTypes"
import type { SearchSortItem } from "../flow/searchTypes"
import type { Profile } from "../flow/profileTypes"
import {
  canCreateChannelProgram,
  canMessageLearnersProgram,
  hasStaffForProgram
} from "../lib/roles"
import CustomRefinementListFilter from "./search/CustomRefinementListFilter"

export const makeTranslations: () => Object = () => {
  const translations = {}
  for (const code of Object.keys(iso3166.data)) {
    translations[code] = iso3166.data[code].name
    for (const stateCode of Object.keys(iso3166.data[code].sub)) {
      translations[stateCode] = iso3166.data[code].sub[stateCode].name
    }
  }
  return translations
}

const SEMESTER_SEASON_NUMBER_VALUE = {
  Spring: "1",
  Summer: "2",
  Fall:   "3"
}

// Produces a descending date-ordered list from bucket values like '2016 - Fall'
const sortSemesterBuckets = R.compose(
  R.reverse,
  R.sortBy(
    // '2016 - Fall' -> '20163', '2016 - Spring' -> '20161'
    R.compose(
      yearSeasonArr =>
        `${yearSeasonArr[0]}${SEMESTER_SEASON_NUMBER_VALUE[yearSeasonArr[1]]}`,
      R.split(/[^\w]+/),
      R.prop("key")
    )
  )
)

export const sortOptions: Array<SearchSortItem> = [
  {
    label:  "Last Name A-Z",
    key:    "name_a_z",
    fields: [
      { field: "profile.last_name", options: { order: "asc" } },
      { field: "profile.first_name", options: { order: "asc" } }
    ]
  },
  {
    label:  "Last Name Z-A",
    key:    "name_z_a",
    fields: [
      { field: "profile.last_name", options: { order: "desc" } },
      { field: "profile.first_name", options: { order: "desc" } }
    ]
  },
  {
    label: "Grade High-to-low",
    field: "program.grade_average",
    order: "desc",
    key:   "grade-high-low"
  },
  {
    label: "Grade Low-to-High",
    field: "program.grade_average",
    order: "asc",
    key:   "grade-low-high"
  },
  {
    label:  "Country A-Z",
    key:    "loc-a-z",
    fields: [
      { field: "profile.country", options: { order: "asc" } },
      { field: "profile.city", options: { order: "asc" } }
    ]
  },
  {
    label:  "Country Z-A",
    key:    "loc-z-a",
    fields: [
      { field: "profile.country", options: { order: "desc" } },
      { field: "profile.city", options: { order: "desc" } }
    ]
  }
]

export default class LearnerSearch extends SearchkitComponent {
  props: {
    checkFilterVisibility: (s: string) => boolean,
    setFilterVisibility: (s: string, v: boolean) => void,
    openSearchResultEmailComposer: (searchkit: Object) => void,
    openChannelCreateDialog: (searchkit: Object) => void,
    openLearnerEmailComposer: (profile: Profile) => void,
    children: React$Element<*>[],
    currentProgramEnrollment: AvailableProgram
  }

  dropdownOptions: Option[] = [
    { value: "name", label: "Sort: name" },
    { value: "dob", label: "Sort: dob" }
  ]

  translations: Object = makeTranslations()

  constructor(props: Object) {
    super(props)
    this.WrappedLearnerResult = wrapWithProps(
      { openLearnerEmailComposer: this.props.openLearnerEmailComposer },
      LearnerResult
    )
  }

  getNumberOfCoursesInProgram = (): number => {
    const { currentProgramEnrollment } = this.props
    return R.pathOr(0, ["total_courses"], currentProgramEnrollment)
  }

  renderSearchHeader = (): React$Element<*> | null => {
    const {
      openSearchResultEmailComposer,
      openChannelCreateDialog,
      currentProgramEnrollment
    } = this.props
    const canEmailLearners = canMessageLearnersProgram(
      currentProgramEnrollment,
      SETTINGS.roles
    )
    const canCreateChannel =
      SETTINGS.FEATURES.DISCUSSIONS_CREATE_CHANNEL_UI &&
      canCreateChannelProgram(currentProgramEnrollment, SETTINGS.roles)

    if (_.isNull(this.getResults())) {
      return null
    }

    return (
      <Grid container className="search-header">
        <Grid item xs={7} className="result-info">
          {canEmailLearners ? (
            <button
              id="email-selected"
              className="mdl-button minor-action"
              onClick={R.partial(openSearchResultEmailComposer, [
                this.searchkit
              ])}
            >
              Email Selected
            </button>
          ) : null}
          {canCreateChannel ? (
            <button
              id="create-channel-selected"
              className="mdl-button minor-action"
              onClick={R.partial(openChannelCreateDialog, [this.searchkit])}
            >
              New Channel
            </button>
          ) : null}
          <HitsStats component={HitsCount} />
        </Grid>
        <Grid item xs={5} className="pagination-search">
          <CustomSearchBox
            queryBuilder={MultiMatchQuery}
            searchOnChange={true}
            queryFields={[
              "profile.first_name.folded",
              "profile.last_name.folded",
              "profile.preferred_name.folded",
              "profile.username.folded",
              "profile.full_name.folded",
              "email.folded"
            ]}
            queryOptions={{
              analyzer: "folding",
              type:     "phrase_prefix"
            }}
          />
          <Pagination
            showText={false}
            listComponent={CustomPaginationDisplay}
          />
        </Grid>
        <Grid item xs={12} className="mm-filters">
          <SelectedFilters itemComponent={ModifiedSelectedFilter} />
          <ResetFilters component={CustomResetFiltersDisplay} />
        </Grid>
        <Grid item xs={12} className="sorting-header">
          <SortingSelector
            options={sortOptions}
            listComponent={CustomSortingColumnHeaders}
          />
        </Grid>
      </Grid>
    )
  }

  isFilterSelected = (filterName: string) => {
    const nestedList = findObjByName(
      R.pathOr([], ["bool", "must"], this.getQuery().query.post_filter),
      "nested"
    )

    for (const obj of nestedList) {
      const term = R.pathOr(null, ["query", "term"], obj)
      if (_.has(term, filterName)) {
        return true
      }
    }
    return false
  }

  renderFacets = (currentProgram: AvailableProgram): React$Element<*> => {
    if (_.isNull(this.getResults())) {
      return (
        <Card className="card fullwidth" shadow={1}>
          <CardContent>
            <div className="no-hits left-nav">
              {`There are no users in the ${currentProgram.title} program.`}
            </div>
          </CardContent>
        </Card>
      )
    }
    const isStaff = hasStaffForProgram(currentProgram, SETTINGS.roles)

    return (
      <Card className="card fullwidth" shadow={1}>
        <FilterVisibilityToggle
          {...this.props}
          title="Course"
          filterName="courses"
          stayVisibleIfFilterApplied="final-grade"
          disabled={this.isFilterSelected("program.course_runs.semester")}
        >
          <NestedAggregatingMenuFilter
            field="program.courses.course_title"
            fieldOptions={{
              type:    "nested",
              options: { path: "program.courses" }
            }}
            title=""
            id="courses"
          />
        </FilterVisibilityToggle>
        {isStaff ? (
          <div className="final-grade-wrapper">
            <FinalGradeRangeFilter
              field="program.courses.final_grade"
              fieldOptions={{
                type:    "nested",
                options: { path: "program.courses" }
              }}
              id="final-grade"
              min={0}
              max={100}
              showHistogram={true}
              title="Final Grade in Selected Course"
            />
          </div>
        ) : null}
        {isStaff ? (
          <FilterVisibilityToggle
            {...this.props}
            filterName="payment_status"
            title="Payment Status"
          >
            <NestedAggregatingMenuFilter
              field="program.courses.payment_status"
              fieldOptions={{
                type:    "nested",
                options: { path: "program.courses" }
              }}
              title=""
              orderKey="_term"
              id="payment_status"
            />
          </FilterVisibilityToggle>
        ) : null}
        <FilterVisibilityToggle
          {...this.props}
          filterName="semester"
          title="Enrolled Semester"
          disabled={this.isFilterSelected("program.courses.course_title")}
        >
          <CustomRefinementListFilter
            id="semester"
            title=""
            fieldOptions={{
              type:    "nested",
              options: { path: "program.course_runs" }
            }}
            field="program.course_runs.semester"
            operator="OR"
            itemComponent={CheckboxItem}
            listComponent={MultiSelectCheckboxItemList}
            bucketsTransform={sortSemesterBuckets}
            size={15}
          />
        </FilterVisibilityToggle>
        {isStaff ? (
          <FilterVisibilityToggle
            {...this.props}
            filterName="num-courses-passed"
            title="# of Courses Passed"
          >
            <EnabledSelectionRangeFilter
              field="program.num_courses_passed"
              id="num-courses-passed"
              min={0}
              max={this.getNumberOfCoursesInProgram()}
              showHistogram={false}
              title=""
            />
          </FilterVisibilityToggle>
        ) : null}
        {isStaff ? (
          <FilterVisibilityToggle
            {...this.props}
            filterName="grade-average"
            title="Average Grade in Program"
          >
            <EnabledSelectionRangeFilter
              field="program.grade_average"
              id="grade-average"
              min={0}
              max={100}
              showHistogram={true}
              title=""
            />
          </FilterVisibilityToggle>
        ) : null}
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
            size={1000} // should contain all the countries
            translations={this.translations}
          />
        </FilterVisibilityToggle>
        {isStaff ? (
          <FilterVisibilityToggle
            {...this.props}
            filterName="education-level"
            title="Degree"
          >
            <EducationFilter id="education_level" />
          </FilterVisibilityToggle>
        ) : null}
        <FilterVisibilityToggle
          {...this.props}
          filterName="company-name"
          title="Company"
        >
          <WorkHistoryFilter id="company_name" />
        </FilterVisibilityToggle>
      </Card>
    )
  }

  render() {
    const { currentProgramEnrollment } = this.props

    return (
      <Loader loaded={!this.isInitialLoading()} shouldRenderAll={true}>
        <div className="learners-search">
          <ProgramFilter currentProgramEnrollment={currentProgramEnrollment} />
          <Grid container spacing={2} className="search-grid">
            <Grid item xs={3} className="search-sidebar">
              {this.renderFacets(currentProgramEnrollment)}
            </Grid>
            <Grid item xs={9}>
              <Card className="card fullwidth results-padding" shadow={1}>
                <CardContent>
                  {this.renderSearchHeader()}
                  <Hits
                    className="learner-results"
                    hitsPerPage={SETTINGS.es_page_size}
                    itemComponent={this.WrappedLearnerResult}
                  />
                  <CustomNoHits />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </div>
      </Loader>
    )
  }
}
