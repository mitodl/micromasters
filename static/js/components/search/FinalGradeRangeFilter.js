import {RangeFilter} from "searchkit";
import FinalGradeRangeAccessor from './FinalGradeRangeAccessor';

export default class FinalGradeRangeFilter extends RangeFilter {

  defineAccessor() {
    const {
      id, title, min, max, field, fieldOptions,
      interval, showHistogram
    } = this.props;
    return new FinalGradeRangeAccessor(id, {
      id, min, max, title, field,
      interval, loadHistogram: showHistogram, fieldOptions
    });
  }
}
