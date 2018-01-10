// @flow
import { Accessor, SearchkitComponent } from "searchkit"

const WithAccessor = (
  BaseSearchkitComponent: SearchkitComponent,
  defineAccessor: (component: SearchkitComponent) => Accessor
) =>
  class extends BaseSearchkitComponent {
    defineAccessor() {
      return defineAccessor(this)
    }
  }

export default WithAccessor
