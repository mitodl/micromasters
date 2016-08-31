// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import ReactTooltip from 'react-tooltip';

import SelectField from './inputs/SelectField';
import CountrySelectField from './inputs/CountrySelectField';
import StateSelectField from './inputs/StateSelectField';
import ProfileFormFields from '../util/ProfileFormFields';
import TermsOfServiceDialog from './TermsOfServiceDialog';
import type {
  Profile,
  SaveProfileFunc,
  ValidationErrors,
  UpdateProfileFunc,
} from '../flow/profileTypes';
import type { Validator, UIValidator } from '../util/validation';
import type { UIState } from '../reducers/ui';

export default class PersonalForm extends ProfileFormFields {
  props: {
    profile:                Profile,
    errors:                 ValidationErrors,
    saveProfile:            SaveProfileFunc,
    updateProfile:          UpdateProfileFunc,
    validator:              Validator|UIValidator,
    setTOSDialogVisibility: (b: boolean) => void,
    showTOSInputs:          boolean,
    ui:                     UIState,
  };

  render() {
    const {
      setTOSDialogVisibility,
      ui: { tosDialogVisibility },
      showTOSInputs,
    } = this.props;
    let toggleTOSDialog = () => setTOSDialogVisibility(!tosDialogVisibility);

    let tosCheckboxLabel = <span>
      By clicking "Next" I certify that I agree with
      <a onClick={toggleTOSDialog}>
        {" MIT MicroMasters Terms of Service."}
      </a>
    </span>;

    let tosDialog = <TermsOfServiceDialog
      open={tosDialogVisibility}
      toggleTOSDialog={toggleTOSDialog}
      {...this.props}
    />;

    let tosCheckbox = <Cell col={12} className="tos-checkbox">
      {this.boundCheckbox(['agreed_to_terms_of_service'], tosCheckboxLabel)}
    </Cell>;

    const whyWeAskThis = 'Some program sponsors and employers offer benefits or scholarships ' +
      'to learners with specific backgrounds.';

    return (
      <Grid className="profile-form-grid">
        { showTOSInputs ? tosDialog : null }
        <Cell col={6}>
          {this.boundTextField(["first_name"], "Given name")}
        </Cell>
        <Cell col={6}>
          {this.boundTextField(["last_name"], "Family name")}
        </Cell>
        <Cell col={12}>
          {this.boundTextField(["preferred_name"], "Preferred name")}
        </Cell>
        <Cell col={12}>
          {this.boundDateField(['date_of_birth'], 'Date of birth')}
        </Cell>
        <Cell col={12} className="profile-gender-group">
          {this.boundRadioGroupField(['gender'], 'Gender', this.genderOptions)}
        </Cell>
        <Cell col={12}>
          <SelectField
            keySet={['preferred_language']}
            label='Preferred language'
            options={this.languageOptions}
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={12}>
          <div className="section-header">
            Where are you currently living?
          </div>
        </Cell>
        <Cell col={4}>
          <CountrySelectField
            stateKeySet={['state_or_territory']}
            countryKeySet={['country']}
            label='Country'
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={4}>
          <StateSelectField
            stateKeySet={['state_or_territory']}
            countryKeySet={['country']}
            label='State or Territory'
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={4}>
          {this.boundTextField(['city'], 'City')}
        </Cell>
        <Cell col={12}>
          <div className="section-header">
            Where are you from? <span
              className="tooltip-link"
              data-tip
              data-for='why-we-ask-this'
              style={{"display": "inline-block"}}
            >(Why we ask this)</span>
            <ReactTooltip id="why-we-ask-this" effect="solid" event="click" globalEventOff="click">
              {whyWeAskThis}
            </ReactTooltip>
          </div>
        </Cell>
        <Cell col={4}>
          <CountrySelectField
            countryKeySet={['birth_country']}
            label='Country of birth'
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={4}>
          <CountrySelectField
            countryKeySet={['nationality']}
            label='Nationality'
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        { showTOSInputs ? tosCheckbox : null }
      </Grid>
    );
  }
}
