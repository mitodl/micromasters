// @flow
import { Accessor, SearchkitComponent } from "searchkit"

const WithAccessor = (
  BaseSearchkitComponent: SearchkitComponent,
  accessor: Accessor
) =>
  class extends BaseSearchkitComponent {
    defineAccessor() {
      return new accessor(this.props.id, this.getAccessorOptions())
    }
  }

export default WithAccessor
