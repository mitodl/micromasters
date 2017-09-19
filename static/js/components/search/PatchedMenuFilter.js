// @flow
import { MenuFilter } from "searchkit"

// NOTE:
// This is a hack to get around a Searchkit bug (https://github.com/searchkit/searchkit/issues/327).
// The 'bucketsTransform' prop is broken for the MenuFilter component. This class overrides 'getItems'
// for MenuFilter to get it working. This implementation also gets rid of the 'All' option in the
// list of MenuFilter choices, which otherwise shows up by default.

export default class PatchedMenuFilter extends MenuFilter {
  getItems() {
    return this.props.bucketsTransform(this.accessor.getBuckets())
  }
}
