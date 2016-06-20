import React from 'react';

class Footer extends React.Component {
  render () {
    return (
      <footer>
         <div className="container container-footer">
            <div className="row">
               <div className="col-md-8">
                  <img src="/static/images/mit-logo-ltgray-white@72x38.svg" alt="MIT" width="72" height="38" />
                  <div className="footer-links">
                      <a href="https://www.edx.org/" target="_blank">edX</a>
                      <a href="https://odl.mit.edu/" target="_blank">Office of Digital Learning</a>
                  </div>
                  <div className="footer-address">
                     Massachusetts Institute of Technology<br/> Cambridge, MA 02139
                  </div>
               </div>
               <div className="col-md-4 text-right">
                  <div className="footer-cta">
                     <a href="https://giving.mit.edu/explore/campus-student-life/digital-learning" target="_blank"
                       className="btn btn-primary">Give to MIT</a>
                  </div>
                  <div className="footer-copy">&copy; 2016, Massachusetts Institute of Technology</div>
               </div>
            </div>
         </div>
      </footer>
    );
  }
}

export default Footer;
