Release Notes
=============

Version 0.12.0
--------------

- Added ErrorMessage to UserPage
- Changed dateFields to disallow non-numerical input (#641)
- Added deadline for upgrade
- Removed some (now) useless cases in constants
- FAQ collapsed by default
- Added spinner and error message for profile page (#661)
- Added user page link to dropdown
- Changed field of study select to match anywhere in string w/ highlighted text
- Removed routing from profile flow
- added docstring
- fixed MORE unit tests
- fixed js test
- refactored error page code and fixed unit tests
- nevermind. tabs changed to spaces in base_error.html
- changed base_error.html to match tab/space style, which is apparently mixed
- Added user page link to dropdown
- Added thumbnail to wagtail CMS (#625)
- Redirected to 404 if user goes to a missing user page (#629)
- Added spinner for dashboard (#646)
- Removed x&#39;s from text fields (#642)
- Tests fixed
- Removed upgrade logic from the frontend
- Changed the label of settings button
- Added settings page
- Added link to home page on program page logo (#645)
- Added text to JumboTron for terms of service (#644)
- Updated validation text (#643)
- Added resumeOrder to education entries
- Updated edx-api-client requirement
- Removed padding from date field (#631)
- Removed UI validators from PrivacyTab validator callback
- Raised 404 exception when user wants to access someones profile whose privacy mode is set tp private
- Fixed filtering text to remain if textbox clicked (#628)
- Made FieldsOfStudySelectField wider
- Added new types for Course, CourseRun, added flow to many files
- Added react-virtualized to AutoComplete (#568)
- Fixed style regression (#624)
- Link opens in the same page
- Added possibility to link external program pages
- Added custom 500 page
- Added &#39;confirm delete all entries&#39; when closing switches
- Sorted employment entries in resume order
- Updated documentation to reflect edX changes
- First working version
- Removed apostrophe from MicroMaster&#39;s (#560)
- Updated to redux-asserts 0.0.8 and fixed related test failures (#616)
- Fixed bug with preferred name not updating on Jumbotron
- Added babel-polyfill to support IE11 (#611)
- Swapped courses and faq in program page
- Upgraded to wagtail 1.5.2
- Fixed spinner positioning (#563)
- Bumped django version

Version 0.11.0
--------------

- Updated field of study select to use JSON data
- Increased test timeout (#566)
- Tightened up spacing for education and work history forms
- Made enroll and upgrade buttons accessible (#556)
- Fixed bug with MM id in Jumbotron
- Hid work history switch on user page
- Added end-to-end ui tests for adding education and work entries
- Added flow typechecking for JS
- Removed popover from EducationDisplay on /users
- Set work history switch to be on by default
- Made all footer links open in new tab
- Fixed Button style (#537)
- Added error handling in the dashboard.
- Moved program link from title to entire card (#525)
- Used chai to assert Promise behavior (#535)
- Added extra validation for dates (#523)
- Added validation for employment and education switches (#504)
- Fixed punctuation for button (#526)
- Condensed EducationForm on `/users`
- Used level of attainment from edX to set default switch values (#508)
- Set default value of account_privacy set to &#39;public to other MicroMaster’s students&#39;
- Added check to only show edit buttons for a user&#39;s own profile
- Fixed missed test assertions (#511)
- Added contanct_us and title to ProgramPage
- Added background_image to ProgramsPage
- Moved profile privacy hint below the radio buttons
- Added confirmation dialog when deleting education and work entries
- Removed singleTest command, allow test with parameter to run arbitrary files (#505)
- Removed python3-dev which points to a python 3.4 branch (#499)
- Added Roboto font everywhere
- Fixed bug: no enroll button if edx_course_key is not defined
- Refactored profile classes (#501)
- Made npm install quieter (#497)
- Fixing path for JS assets on Mailchimp form
- change safe tag to richtext
- replced smaller mit logo
- test program page context
- addressing comments
- Updated Programs page

Version 0.10.0
--------------

- Fixed handling of multiple validation errors for education and work history (#491)
- Moved validation functions to `validation.js`
- Made personal info editable on user page
- Fixed two JS console warnings
- Added ability to edit education to users page
- Allowed nulls for education and employment fields (#463)
- Added previous button to profile pages
- Docker with python35
- Switched to old OAUTH endpoints for edX

Version 0.9.0
-------------

- Added handler for rejected promises (#454)
- Fixed design of homepage to match mockups
- Added footer at dashboard, terms of service, profile and addded button on homepage footer
- Fixed design of appy for master button
- Fixed high school validation error (#444)
- Added ability to edit employment on profile page
- Added progress indicator to profile (#435)
- Switched to social auth username (#420)
- Replaced all references to MicroMasters with MicroMaster’s
- Support for gravatar
- Replace MicroMaster&#39;s certificate text with MicroMaster&#39;s credential in app
- Added step to run webpack during travis tests
- Added minimal Dockerfile to run tests with
- Added missing action to integration tests
- Removed field of study for high school education
- Changed AutoComplete to focus on text field after selecting an item
- Converted industry text field to select field
- Fixed radio options to be shown if nothing is selected
- Modified profile REST api to honor privacy settings
- Replaced react-datepicker with textfields
- Updated personal tab to look like mockups
- Changed JS setup to use npm-shrinkwrap
- Fixed UI for month/year field
- Updated style of education tab
- Added tests to increase coverage
- Updated the terms of service.
- Removed dialog from profile validation
- Revert &quot;Added highlight approach to missing fields instead of popup&quot;
- Added Dashboard splash screen to profile tabs
- Cleared state field when country field changes
- Fixed rebase issues
- Update failing tests
- Refactoring
- Removed dialog from profile validation
- Fixed bug with LoginButton not updating preferred name
- fixed webpack_if_prod script - can now run on OSX host machines with no problem
- Updated privacy tab in profile.
- Removed AutoComplete onBlur handling when user has clicked a menu item
- Used later version of React to fix test failures
- Removed node-neat
- Added middleware to redirect canceled authorizations
- Changed OSX Docker workflow to expect the webpack server to be run on the host machine
- Added User page
- Moved blankWorkHistoryEntry to a function
- Fixed AutoComplete quirks
- Added favicon

Version 0.8.0
-------------

- Use Django OAuth Toolkit
- Turned on dialog scrollbars
- Redirect to profile if the profile is not complete
- Fixed clear profile edit bug
- Refactored profiles reducer to handle multiple profiles
- Moved education reducers and actions into `ui`
- Added prefer-template eslint rule
- Implemented UI for showing course runs in dashboard
- Added &#39;delete&#39; functionality to education entries
- Used state select field for education tab
- Added tests for api functions
- Marked profile as incomplete when it&#39;s being filled out and as complete when it&#39;s done
- Changed location order to Country -&gt; State -&gt; City
- Added fake values for employment and education constants
- Removed not implemented links in dropdown menu
- Fixed profile submission to wait for a 200
- Changed all class properties to use es7 class property syntax
- Implemented new employment page design
- Added requirement for state_or_territory on PersonalTab
- Only live programs are available in dashboard
- Additional changes to the admin
- Implemented refresh token
- Updated micromasters documentation
- Fixed urls for enroll and upgdate course in a program
- added edx_course_key to courserun list display in admin
- Removed onBlur callback from AutoComplete
- Removed hello_test.js
- Added field for month/year
- Added material-ui AutoComplete
- Upgraded to latest django
- Added material-ui, replaced react-mdl Dialog with material-ui Dialog
- Added no-var and camelcase eslint rules
- Removed dashboard link from dashboard page and added this link to username on header dropdown.
- Added dashboard links to enroll and upgrade courses, and a disabled button to apply for masters on campus.
- education tab
- Updated redux-asserts
- Added check for profile completeness before visiting dashboard
- change account_privacy error message
- fix pipeline_api tests
- Added Privacy tab to profile
- Old not passed courses in dashboard API
- Updated profile PATCH code to use return value as new profile
- Created employment history table and migration
- Updated date to datetime to match CourseRun fields
- Upgraded npm packages
- Added field for state or territory
- Removed programs and courses APIs which are replaced by dashboard API

Version 0.7.0
-------------

- Moved stage1 plugin into production. Add --bail to exit with non-zero status on error
- Removed test.js
- Added semicolon enforcement rule
- Added employment to profile model, expanded employment tab
- Removed unused authentication state, use profile state instead for name
- Fixed JS console error with react-router history
- Updated frontend for changes to dashboard API
- Added `singleTest` to package.json for running a single JS test file
- osx_run script
- Made `npm test` run the tests
- Dashboard JSON refactored
- Added page for terms of service
- Incorporated updated homepage design
- Moved onUpdate from Route to Router
- Pointing the edx-api-client requirement to release
- After login the user is redirected to dashboard
- Added ProfileTab utility class
- Added script to run development server on OS X without docker

Version 0.6.0
-------------

- Fixed striptags requirement issue
- Certificates taken in account in dashboard
- Removed node-sass rebuild step
- Added fields to factory
- Added course progress indicator for dashboard
- Added country and city fields

Version 0.5.0
-------------

- Deleted the `employment` route placeholder
- Styled the homepage
- Added validation to personal page on profile
- Move arguments for boundSelectField for consistency

Version 0.4.0
-------------

- Use only information from dashboard API for dashboard display.
- The dashboard API has to return the course run pk
- Implemented API dashboard function
- Added setup documentation
- Added react-router to profile tabs, moved redux form logic to shared module
- Added saveProfile action dispatcher, tests for saveProfile and updateProfile
- Fixed bug: default profile image
- Added REST API for dashboard
- Updated eslint configuration
- Added auto-incrementing `student_id` field to `Profile`
- Fixed a JS console warning, react-router and react-bootstrap
- Fixed a small bug with the dashboard background image
- Added profile React component
- Added fields, updated serializer for personal data on profile
- Added stata center image to Dashboard user card background
- Added a minimal pytest for quick feedback
- Added Profile and Settings links to dropdown menu
- Added missing configuration for heroku to app.json
- Moved our pipeline functions down the python-social-auth pipeline
- Removed programs link in the header
- Added wagtail, use it for home page

Version 0.3.0
-------------

- Moved JS tests to npm scripts
- Added google analytics to base ui template
- Added redirect, &quot;/dashboard&quot; -&gt; &quot;/&quot; if user not logged in
- Implemented React component for dashboard API
- Added MIT Micromasters graphic and updated title
- Display student avatar and name
- Made log out button on dashboard log user out
- Added CourseRun to gen_fake_data
- Updated tox version
- Removed redux-actions
- Introduced new Course model to support CourseRuns
- Added code coverage for javascript
- Added sign-in-with LinkedIn backend support.
- Removed configureStore_test.js, use redux-asserts instead
- Updated django-server-status
- Fixed LICENSE organization

Version 0.2.0
-------------

- Updated dockerignore
- Removed pip from apt.txt, this gets installed separately
- Moved factory libraries to requirements.txt to fix management commands
- Use sitepackages=True so tox reuses the same packages in the docker environment
- Added REST API for profiles
- Added dockerignore
- Implemented student Dashboard
- Implemented course list component
- Profiles creation
- Correct the heroku runtime
- Added model for user profiles
- Added django specific pylint
- Upgraded Django to security release
- Removed static/sass, merged into static/scss
- Removed setup.py
- Rename inner to dashboard, and outer to public.
- Add react, redux and friends.

Version 0.1.0
-------------

- Fetch information for user profile from edX
- Pass authentication info to template.
- Implemented home page
- Added Servers status app
- Implemented proof of concept for Python Social Auth backend
- Renamed npm_install_if_prod.sh to webpack_if_prod.sh
- Added setting for TLS redirection
- Add missing variables to app.json
- Added logging and email config
- Configured sass and css in webpack
- Add pre and post compile hooks (migrations and git hash)
- Created admin for courses and programs.
- upgraded uwsgi for incompatibility with mac env
- Added courses &amp; programs w/ REST API
- Fix failing tests.
- Specify python 3 runtime for Heroku
- Add newrelic agent
- Initial setup for micromasters portal

