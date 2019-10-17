// @flow
import React from "react"
import _ from "lodash"
import VirtualizedSelect from "react-virtualized-select"
import { Creatable } from "react-select"

import { validationErrorSelector, classify } from "../../util/util"
import { sendFormFieldEvent } from "../../lib/google_analytics"
import type { Option } from "../../flow/generalTypes"
import type { Validator, UIValidator } from "../../lib/validation/profile"
import type {
  Profile,
  ValidationErrors,
  UpdateProfileFunc
} from "../../flow/profileTypes"

export const CREATE_OPTION_REGEX = /^Create option "|"$/g

type SelectFieldProps = {
  allowCreate?: boolean,
  className: string,
  errors: ValidationErrors,
  id?: string,
  keySet: Array<string>,
  label: string,
  onChange: Function,
  options: Array<Option>,
  profile: Profile,
  topMenu: boolean,
  updateProfile: UpdateProfileFunc,
  updateValidationVisibility: (xs: Array<string>) => void,
  validator: Validator | UIValidator
}

class SelectField extends React.Component {
  constructor(props: SelectFieldProps) {
    super(props)
    this.state = {
      customOptions: []
    }
  }

  state: {
    customOptions: Array<Option>
  }

  onChange = (selection: Option): void => {
    const { profile, updateProfile, keySet, validator } = this.props
    const clone = _.cloneDeep(profile)
    _.set(
      clone,
      keySet,
      selection && selection.value
        ? selection.value.replace(CREATE_OPTION_REGEX, "")
        : ""
    )
    updateProfile(clone, validator)
  }

  onBlur = (): void => {
    const {
      updateValidationVisibility,
      validator,
      updateProfile,
      profile,
      keySet
    } = this.props
    if (_.isFunction(updateValidationVisibility)) {
      updateValidationVisibility(keySet)
    }
    updateProfile(profile, validator)
    sendFormFieldEvent(keySet)
  }

  className = (): string => {
    const { className, label } = this.props
    return `select-field ${classify(className)} ${classify(label)}`
  }

  formattedId = (): string => {
    const { id, label } = this.props
    return id ? id : _.uniqueId(classify(label))
  }

  selectClassName = (): string => {
    const { errors, keySet, topMenu } = this.props
    return `${validationErrorSelector(errors, keySet)} ${
      topMenu ? "menu-outer-top" : ""
    }`
  }

  label = (label: string, element: React$Element<*>) => (
    <label className="react-select-label">
      {label}
      {element}
    </label>
  )

  addCustomOptions = () => {
    const { keySet, profile, allowCreate, options } = this.props
    const { customOptions } = this.state

    const value = _.get(profile, keySet)
    const combinedOptions = options.concat(customOptions)
    if (
      allowCreate &&
      value &&
      !combinedOptions.find(option => option.value === value)
    ) {
      this.setState({
        customOptions: customOptions.concat({ value: value, label: value })
      })
    }
  }

  componentDidUpdate() {
    this.addCustomOptions()
  }

  componentDidMount() {
    this.addCustomOptions()
  }

  renderSelect = (): React$Element<*> => {
    const { keySet, profile, allowCreate, options } = this.props
    const { customOptions } = this.state

    return (
      <VirtualizedSelect
        value={_.get(profile, keySet, "")}
        className={this.selectClassName()}
        onChange={this.onChange}
        clearable={false}
        onBlur={this.onBlur}
        selectComponent={allowCreate ? Creatable : null}
        {...this.props}
        options={options.concat(customOptions)}
      />
    )
  }

  render() {
    const { errors, keySet, label } = this.props
    return (
      <div className={this.className()} id={this.formattedId()}>
        {label ? this.label(label, this.renderSelect()) : this.renderSelect()}
        <span className="validation-error-text">{_.get(errors, keySet)}</span>
      </div>
    )
  }
}

export default SelectField
