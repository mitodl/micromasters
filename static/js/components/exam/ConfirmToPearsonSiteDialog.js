// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';

import { setToPearsonSiteDialogVisibility }  from '../../actions/ui';
import { dialogActions } from '../inputs/util';

const openPearsonSiteLink = () => {
  const pearsonSiteUrl = "http://www.pearsonvue.com/mitx/locate/";
  let pearsonSiteWindow = window.open(pearsonSiteUrl, '_blank');
  pearsonSiteWindow.focus();
  setToPearsonSiteDialogVisibility(false);
}

type ToPearsonSiteProps = {
  open: boolean,
  show: () => void
}

const ConfirmToPearsonSiteDialog = ({ open, show }: ToPearsonSiteProps) => (
  <Dialog
    contentClassName="dialog"
    className="dialog-to-pearson-site"
    open={open}
    onRequestClose={() => show(false)}
    actions={dialogActions(() => show(false), () => openPearsonSiteLink())}
    autoScrollBodyContent={true}>
    <div className="dialog-content">
      <img src="/static/images/pearson_vue.png" width="200" height="70"/>
      <h3 className="dialog-title">Test Registration is completed on the Pearson VUE website</h3>
      <p>
        I acknowledge that by clicking Continue I will be leaving the MicroMasters website and going to
        the Pearson VUE website, and that I accept the Pearson VUE Group’s <a target="_blank"
        href="https://home.pearsonvue.com/Legal/Privacy-and-cookies-policy.aspx">Terms of Service</a>.
      </p>
    </div>
  </Dialog>
);

export default ConfirmToPearsonSiteDialog;
