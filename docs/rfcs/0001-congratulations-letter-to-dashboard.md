## Add Congratulations Letter to Dashboard

### Abstract

As a learner who has earned a program certificate, I sometimes have trouble explaining the meaning and value of the certificate. It's useful to have a letter from the faculty that describes my accomplishment that I can share with employers, in addition to the certificate.

### Architecture Changes

We have already codebase for program certificate creation, logic of creating program congratulation is more or less same as program certificate creation.

#### Database:
We can add new model `MicromastersProgramCommendation` in `grades/models.py` with the following fields.

* User
* Program
* Hash/UUID

Previously we are using manually created hash for program certificates in `MicromastersProgramCertificate`. There is a open question about using UUID.

**Question:** Can we use [uuid](https://docs.djangoproject.com/en/2.1/ref/models/fields/#uuidfield) to uniquely identify user's earned letter. With the usage of it we would no longer need to override save() method to create md5 hash.

#### Business logic:
**New certificates:** We will add new signal in `grades/signals.py`, which will triggered whenever there is a new creation in course certificate. There will be a method, similar to `grades.api.generate_program_certificate` in which we can filter non-fa users and create letter for related program if available.
 
**Existing certificates:** For back population and scheduled task, we can write a management command for creating letters similar to `grades/management/commands/generate_program_certificates.py`. We can filter programs by passing `financial_aid_availability` parameter.

#### UI:
For UI purpose we will replicate logic of `certificates.views.ProgramCertificateView`. Add new template in `ui/templates` to render letter. We have already logic written in `ProgramCertificateView` to get signatories from ProgramPage. 
In the dashboard in the `ProgressWidget` we will show a link to the letter (for now show it only to SCM program learners)

### Security Considerations

The letters are intended to be printed and also to be shared via URL. So no login will be required.

### Testing & Rollout

* This feature will be behind a feature flag, so we can easily toggle between enable/disable.
* As we have described in #business-logic, that we will add a management command for back population of letters for existing certificates.
* For testing purpose unit test will be added to cover the feature.