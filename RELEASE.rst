Release Notes
=============
Version 0.28.1
--------------

- Revert &quot;Changed profile validation to not require a photo&quot;


Version 0.28.0
--------------

- Remove extra lines which were accidentally committed (#2023)
- Increase socket-timeout (#2010)
- Added redirect when visitors are using the herokuapp domain (#1998)
- Use HTML elements that are more semantic (#2003)
- Removed &#39;Clear all filters&#39; link when user switch pages of unfiltered search (#1989)
- fixes a layout issue on the FAQ tab

Version 0.27.1
--------------

- Removed First and Last Name from the edxorg pipeline

Version 0.27.0
--------------

- Changed profile validation to not require a photo
- Disabled photo button during upload (#1996)
- Add warning about legal name requirement (#1999)

Version 0.26.0
--------------

- Remove alt text from course images (#1939)
- Added truncation for image filenames
- Added more info links to ProgramPage cms
- fix about me width issue
- Enabled integration with rediscloud (#1976)
- Changed image uploader to not use png, it is too big
- Remove closest, use parentNode.parentNode if available (#1970)
- Add test for user without staff or instructor role (#1967)
- Add is_staff for program and financial aid review pages and other cleanup (#1935)
- Use enrollment_url if provided for URL (#1963)
- Fix handling of currently selected unenrolled program (#1950)
- Check element and label in case they&#39;re undefined (#1965)
- Added tests for bundles (#1932)
- Updated address for sending financial aid documents (#1953)
- Added fields to Profile for address and roman name
- Updated babel config
- Added setting to configure Cloudfront (#1924)
- Refactor user edx data fetching
- Refactored profile_edit_test tests (#1947)
- Remove email info from personal profile
- Added cms template for CategorizedFaqsPage preview
- Remove email icon from user profile (#1940)
- Added integration tests for about me (#1933)
- Increase order fulfillment timeout

Version 0.25.3
--------------

-  Changed image uploader to not use png, it is too big  (#1972)

Version 0.25.2
--------------

- Use enrollment_url if provided for URL (#1963)

Version 0.25.1
--------------

- Updated address for sending financial aid documents (#1953)

Version 0.25.0
--------------

- Decrease padding for button within course action column (#1885)
- Remove SETTINGS.username, update tests (#1880)
- Remove red border around income input on Firefox
- Upgrade Raven (#1788)
- Deep freeze for test constants (#1879)
- Fixed exception when clicking &#39;save&#39; without adding a photo
- Fixed future course start date display
- Made profile image required in signup flow
- Fixed ambiguous virgin islands entries
- Use external URL if one exists (#1873)
- CSS fallbacks for home page (#1786)
- Remove border between row and sub rows (#1847)
- Added merchant_defined_data fields (#1727)
- Refactored edX user cached objects
- Updated session to use cookie session instead of DB
- Re-label  &#39;Current Grade&#39; on the dashboard to &#39;Course Progress&#39; and link to EDx Progress tab (#1852)
- Applied email preference when staff emails students in bulk (#1842)
- Increased coverage reporting precision to 2
- Fixed bug with custom select input
- added this option to the currency select in the financial aid calendar
- Set learners name on search to first and last name pair (#1808)
- rebasing
- removes the x in the react select component

Version 0.24.0
--------------

- Fixed browser history for profile tabs (#1363)
- Sort fields of study (#1846)
- Turn off querystring auth so we don&#39;t expire S3 assets (#1840)
- Added &#39;Create option&#39; functionality for industry and field of study
- Refactor UserPage_test (#1845)
- Setup codecov (#1827)
- Made email hide on UserInfoCard when not present
- Upgraded React and several other JS packages
- Changed seed_db requirements
- Added SSL parameters to Elasticsearch connection
- Increased default page size (#1804)
- Increased test coverage (#1793)
- fixes the sort by dropdown layout
- a few small changes and reorder sections on the home page

Version 0.23.0
--------------

- Fixed dashboard API course status regression
- [learners profile] Allow period in url param (#1758)
- Implemented auto approve for TierProgram where discount is $0 (#1723)
- Added environment variable to affect Elasticsearch pagination size (#1743)
- MAINTAINER is deprecated in Dockerfiles (#1759)
- Pass strings to React directly (#1756)
- Turn profile links into buttons (#1754)
- Fix a silly JS error
- Clean up unnecessary JS references in program page (#1715)
- code formatting changes
- slightly move down dropdown error and fix lint error
- react select styling
- Make program list on homepage more accessible
- Replaced Autocomplete with react-select
- moved a style declaration into a different scss file
- Added reset status to financial aid
- Changed webpack config for better splitting and smaller bundles
- Fixed race condition bug with FinancialAidCalculator (#1732)
- fixed hits count javascript error
- style changes
- Removed empty education and work history cards on learners page (#1704)
- Added conn max age and ssl settings to app.json (#1728)
- PGBOUNCER_DEFAULT_POOL_SIZE and PGBOUNCER_MIN_POOL_SIZE need to be json strings (#1724)
- Hide photo upload on public profile (#1603)
- Fixed footer display while JS loads (#1720)
- Updated requirements to use pip-tool (#1649)
- Implemented sending emails on order errors (#1679)
- Change &quot;preferred name&quot; to &quot;Nickname / Preferred Name&quot; (#1696)
- Use &lt;button&gt; for header log in/sign up (#1714)
- Allowed annoAnonymous users to see public profiles (#1702)
- Loaded username param of profile page url from SETTINGS (#1690)
- Zendesk prepopulate program on program page (#1628)
- Employment Form: make space for date field error
- Fixing values for PGBouncer in app.json
- Addressing pylint failures
- Make camera icon accessible (#1701)
- Upgrade pylint to 1.6.4
- Add program name to links on home page (#1700)
- Switch to `manage.py showmigrations` (#1703)
- Add repository and license fields to package.json (#1694)
- Profile: Load existing program enrollments for returning user (#1577)
- Fixed use of /src in docker images (#1699)
- Allow all hosts in DEBUG=True mode
- Import views instead of referencing dotted Python path
- Upgrade Django to 1.10.3
- Python-Social-Auth now wants JSON as a dict, not a string (#1693)
- Added a script to update images on Docker Hub for travis
- Course queries should be ordered by default (#1692)
- Docker Compose version 2 (#1641)

Version 0.22.0
--------------

- Removed react-loader, use react-mdl react (#1653)
- Correctly handle faculty without images (#1634)
- Upgrade Wagtail to 1.7 (#1635)
- Allow to use save button only if photo is selected on &#39;photo upload dialog&#39; (#1654)
- Dashboard model for edx cache refresh timestamps
- Added country_of_residence to FinancialAid model (#1650)
- Fixed education/employment deletion when uploading images (#1675)
- Fixed program enrollment listing bug in signup page (#1674)
- Removed cheaper setting for uWSGI (#1673)
- Reorganized CSS
- ProfilePage scroll top between steps
- Save leading zeros in month field
- Changed url precedence
- removed list of panels
- Added Django Debug Toolbar in Debug mode
- Refactored dashboard API (#1569)
- Change Company Name field
- Added model validation to CoursePrice to fix #1410
- Updated uWSGI to properly use threads and handle static assets (#1648)
- Improved chai assertions (#1647)
- Changed education and employment titles (#1629)
- Upgrade Pillow to 3.4.2 (#1637)
- Upgrade python-social-auth to 0.2.21 (#1643)
- Upgrade Django REST Framework to 3.5.2 (#1638)
- Upgrade NewRelic to 2.72.1.53 (#1642)

Version 0.21.0
--------------

- Made small optimization to user serialization for search results
- Made sure we&#39;re root when doing pip install in travis-web container build
- Fixed pending JS tests (#1631)
- Fixed course date issue in alter_data command
- Fixed alignment of Current Residence on search page (#1607)
- Use DRF API correctly (#1625)
- Implemented inline validation
- Made changes to speed up CI builds
- Fixed header of search page (#1624)
- Added indices for all dates in the CourseRun model
- addied cybersource settings to app.json (#1601)
- Fixed bug with search visibility
- Small change to width of modals on mobile (#1609)
- Replace `SETTINGS.username` with `SETTINGS.user.username` (#1615)
- Refactored Education frontend components (#1606)
- Split enrollments reducer into programs and courseEnrollments (#1586)
- Shown message when no search results (#1449)
- Handling n+1 queries in dashboard
- Added development to the industry vocabulary
- Small PR to make header say MITx MicroMasters (#1610)
- Zendesk prepopulate name/email (#1482)
- Fixed View on edX url inside dashboard (#1591)

Version 0.20.0
--------------

- Upgraded redux-asserts again
- Add a __str__() for Role (#1594)
- Added management commands for fine-grained course state control
- Set background color of Zendesk button (#1496)
- Bumped redux-asserts version to 0.0.9
- Made detect_missing_migrations.sh use makemigrations --dry-run (#1587)
- Make modals more consistent (#1565)
- Hide the x-scroll on program page

Version 0.19.0
--------------

- Refactored financial aid tests (#1495)
- Added enrolled field to ProgramSerializer (#1584)
- Fixed detect_missing_migrations.sh (#1583)
- Refactor test code (#1572)
- Moved ddt into test_requirements.txt (#1576)
- Fixed input bug with the FinancialAidCalculator
- Added programpage_url to /api/v0/programs/ (#1571)
- pinned elasticsearch in docker to 2.4.1 (#1580)
- Remove detect_missing_migrations.sh from build temporarily (#1581)
- Protected detect_missing_migrations.sh against hanging for console input (#1573)
- Removed course run view (#1570)
- Omitted program staff from search results (#1502)
- Prevented an enrollment failure from failing the order (#1552)
- Copy changes per maria&#39;s request (#1557)
- fixed layout bug with footer Give to MIT buttons (#1554)
- Custom Tabs for ProgramPage
- Fixed course description JS bug
- Use bulk indexing for seed_db (#1544)
- Refactored course tests (#1492)
- Add alt text to logos (#1553)
- Customize More Info card
- Refactored buttons html and css and other style changes (#1446)
- Show only published children pages on the ProgramPage
- Clarify title for average grade filter (#1539)
- Fixed course run edx key save issue
- Footer consistency all over app (#1503)
- Logged exception being handled in custom_exception_handler (#1532)
- Reorganized JS code
- Added check for missing migrations (#1491)
- Protected audit tables (#1488)
- Fixed size of image upload container (#1471)
- Removed dashboard links from profile page header (#1505)
- Remove subtype for ProgramPage (#1535)
- Refactored date validation
- Added ability to mark orders as refunded (#1483)
- Added unique constraint to CourseRun edx_course_key
- Implemented mobile sidenav
- Add Smartlook tracking
- update style: removed top padding from searched page (#1504)
- Reverting cms migrations
- Removed mm id from dashboard (#1493)
- Add/remove custom tabs on program page (#1436)
- Note Flow incompatibility within Docker (#1469)
- Fixed preferred Language options (#1475)
- Removed filler-text tooltip (#1484)
- Added audit table for Order, Line (#1456)
- Fixed IE11 support for image upload (#1402)
- Improve profile factories using Faker library (#1476)
- line-height fix for Course list on program page (#1480)
- hid facets when they have no hits (#1407)
- Make footer mit logo a link
- Add app config for seed_data app (#1473)
- Changed discount_amount to have a min of 1 (so we never have multiple… (#1467)
- Seed data app (#1463)
- Added past course run UI to dashboard
- Updated the app.json to include required env vars (#1464)
- Added serialize_model, replaced to_dict (#1447)
- Make position_in_program required
- Make program selector use full dialog width (#1388)
- Fix a bug in course enrollment text (#1416)
- Added FAQs accordion
- Added nplusone library for query profiling in app DEBUG mode
- Added line items to cybersource payload (#1438)
- Added complete financial aid instructions
- Added flow to travis
- Remove deprecated TEMPLATE_CONTEXT_PROCESSORS setting (#1236)
- Fixed error in year validation logic
- Course description popover (#1392)
- Added persistent connection settings for DB
- Added tracking_id to silence warnings (#1403)
- Added webpack_public_path (#1404)
- Fixed console warning for faculty carousel (#1406)
- Modified mail.views responses to catch 401 status codes from mailgun … (#1376)
- Program enrollment does not return error if already exists
- Changed logic to assign the student ID
- Changed copy for financial aid stuff
- Sorted programs in id order (#1387)
- adds admin model for financialaidemailaudit objects (#1380)
- Partial Fix for Responsive Styles in Dashboard (#1386)
- Fixed bug with current grade refresh and no enrollments

Version 0.18.0
--------------

- Updated process count and basicauth exemption (#1395)
- Fix 404 page and social buttons on Terms of Service page
- Serialize program courses to SETTINGS object (#1378)
- Handled invalid dates in dashboard course display
- Fixed issues with popups on IE11, Edge
- Fixed order fulfillment race condition (#1318)
- Fixes failing test on master (#1382)
- Removed learners near me card (#1372)
- Fixed celery scheduling for currency exhange rate updates (#1385)
- Fixed paid course filtering (#1381)
- Country income threshold database model (#1303)
- Fixed path to zendesk_widget.js (#1364)
- fixes footer to page bottom if page content is short (#1365)
- Add CategorizedFaqsPage to the faqs hierarchy
- Remove ParentalKey from faqs model

Version 0.17.0
--------------

- adds has_delete_permission to financial aid django admin model (#1326)
- Limit HomePage to have only PrgramPage as a child page
- Fixes hero image to not scroll on home page (#1348)
- Added sentry to app (#1306)
- Fixed console warning (#1345)
- Fixed user menu wideness
- Add ga tracking to program pages
- Adds a gradient overlay on the faculty carousel (#1319)
- Hid program selector on certain pages
- Added test cases (#1335)
- Fixed bug in financial aid request for determining tier (#1314)
- Fixed image size for faculty carousel (#1300)
- Updated financial aid document address slightly
- Replaced hard coded support email (#1330)
- Implemented enroll links (#1289)
- Added currently-enrolled dashboard course states
- Made photo uploader only accept image files
- fix the failing currency exchange rate command test (#1321)
- Switched profile button order
- Fixed income verification required display
- add dollar sign to email body text for financial aid
- Removed zendesk widget from homepage
- Upgrade wagtail to 1.6.3
- Added logging for IsSignedByCyberSource (#1241)
- Expand country code to country name on review page (#1297)
- changes /users/ to /learner/
- Moved &quot;Show:&quot; outside the dropdown on financial aid review page label and made table responsive (#1284)
- Enabled &#39;View on edX&#39; link on dashboard
- Implemented passed course display (#1268)
- Switched to hosted jquery and bootstrap (#1274)
- Added default currency (based on country) to calculator
- Limited the course grade cache refresh to the enrolled runs
- Created FaqsPage
- Fix for 404 page when passed exception kwarg (#1277)
- Added support for token authentication
- Remove fields from homepage object and CMS (#1165)
- adds error handling for syncing exchange rates with API
- changed names and description
- adding test coverage for currency exchange rate management command
- management command for generating exchange rate objects

Version 0.16.0
--------------

- Updated financial aid review page frontend (#1161)
- Zagaran/financialaidadminlogging (#1263)
- Added ImproperlyConfigured (#1256)
- Fetch course prices and dashboard after every relevant change on the server (#1271)
- Fixed course price API output (#1255)
- Home Page, Program page and App with MIT Brand colors (#1246)
- Added Rest API to audit enroll a user in a course
- makes fields read_only in django admin for financialaidaudit objects (#1258)
- fixes FinancialAidAudit JSONfields (#1244)
- Added ZenDesk help button on MM (#1211)
- Removed rejected status (#1253)
- Fixed Style of mailchimp form (#1166)
- Updated my dashboard link (#1233)
- Added confirmation dialog for skipping financial aid
- Added log.error for every ImproperlyConfigured exception raised
- Implemented document sent date (#1207)
- Added &#39;skip financial aid&#39; feature
- Add back terms of service link in dialog, and change Log in link to act the same as signup (#1182)

Version 0.15.0
--------------

- Add course description and page link (#1209)
- Added configurable basicauth to uWSGI
- Improve social links with Google+ (#1208)
- Added pre-enroll dashboard course states
- Set unique URL for tabs in program page
- Added batch refresh of current grades
- centered the tabs on the program page and added max-width (#1206)
- Added missing migration (#1215)
- Fixed terms of service signup and login buttons (#1183)
- Added select progam to profile tab (#1117)
- Implemented UI for financial aid states (#1185)
- Rh/responsive style tweaks (#1169)
- Add social sharing buttons to public pages
- Exposed the financial aid obj ID in dashboard API
- Implemented email templates for financial aid status change emails (#1188)
- Extracted DateField from boundDateField (#1186)
- Implemented API for learners to skip financial aid and pay full price (#1175)
- Exposed financial aid documents flag on MMTrack
- Removed filter on program enrollments in dashboard API (#1194)
- Implemented API endpoint for submitting date documents were sent (#1162)
- more useful fields in admin list views (#1178)
- Leave Courses on FAQs page
- Custom exception handler
- Implemented personal pricing for ecommerce (#1159)
- changes to income cutoffs (15-&gt;25, 100-&gt;75) and associated tests (#1174)
- updated django to 1.9.10 (#1176)
- Added course price API call to front end
- Implemented abstraction for MM Track
- Fixed some mail tests that were failing in case of environment variable set
- Currency Conversion (#1146)
- Added photo of reif
- slight text change
- added reif quote
- refactor getPreferredName (#1156)
- Update home_page.html (#1164)
- Refactored checkout API to work with non-financial aid programs (#1145)
- Several Small Style changes (#1158)
- Switch to Django JSONField (#1124)
- Removed &#39;Are you a member?&#39;
- Responsive program page (#1152)
- Update homepage text
- Add social meta tags
- Added financial aid calculator
- Financial Aid Auditing (#1138)
- Added management command for creating Tiers/TierPrograms (#1147)
- More accessibility improvements (#1148)
- Removed program enrollment from dialog (#1128)
- Tweaks to the style of the faculty carousel (#1139)
- Financial Aid: Implemented endpoint for retrieving a learner&#39;s course price (#1099)
- Responsive home page (#1143)
- Add description, keywords meta tags, title text
- Fix signup button
- Changed the header with Micromasters logo, and so that home and program page use the same partial file for the navbar html
- Accessibility improvements (#1133)
- Used fill rule to crop faculty images (#1136)
- Faculty carousel (#1079)
- Rh/even more tweaks gio (#1129)
- Set default staff page to learner search (#1126)
- Financial Aid: Implemented review page backend actions (#1096)
- Overrode save method on FinancialAid to ensure uniqueness between Use… (#1104)
- Implemented enrollment after course purchase (#1092)
- Changed names and values for course statuses
- Added support for current grades fetching and caching
- Display courses with enrollment status on ProgramPage
- Added profile image to profile API and to frontend
- Added order receipt and cancellation UI (#1085)

Version 0.14.0
--------------

- Style changes for the home page (#1056)
- Bumped edx-api-client requirement to latest version
- Fixed rotation of progress widget circle (#1088)
- Updated Elasticsearch to use HTTP Basic Auth
- Refactored Toast component (#1084)
- Implemented backbone for review financial aid page (#1071)
- Fixed learners layout (#1026)
- Added order fulfillment API for CyberSource (#913)
- Made progress widget get values from respective program (#1072)
- Standardize on dash separators for Sass
- Realistic user fixes for social username and program enrollments
- Financial Aid: creating new requests (#1053)
- Updated section numbering
- Improvements to installation process documentation
- Added faculty CMS models
- Removed wow.js (#1062)
- Deleted Jumbotron
- Implemented redesign of program page
- Set &quot;Place of Birth&quot; facet to accept multiple values
- Only one role per User can be assigned
- Fix mailchimp signup bug
- Set search facets to be open by default
- addressing comments
- Renamed CoursePrice to CourseStatus (#1037)
- Removed course status (#1033)
- Changed Homepage design
- Removed privacy page from signup flow
- Changed travis.yml around a little
- Implemented &#39;personalized pricing&#39; box on dashboard
- Renamed dashboard API statuses (#1028)
- Added Financial Aid basic models
- Updated UX for work history page of the signup flow
- Sending one email per recipient
- Updated CMS help text, updated thumbnail size (#1016)
- Fixed course display on dashboard (#997)
- Added signup dialog to homepage and program pages
- Added a style sheet for responsive layout (#1001)
- Fixed settings page styling (#1014)
- Disabled SanctuaryJS run-time type checking in production
- Added enrollment dialog (#1000)
- Refactored dashboard page (#993)
- Installed sass-lint and started configuring
- Added elastisearch auth
- Added program selector menu (#976)
- Updated UX for education signup screen
- Various css changes to colors, fonts, margins (#995)
- Style changes for user page (#864)
- Made Css changes to the user search page (#982)
- Fixed improper JSON formatting
- Removed TOS checkbox and validation from signup page
- Filtered out programs which are not live from program enrollments API (#979)
- Fixed course tests (#978)
- Added course price in listing (#960)
- Made edx_level_of_education read only (#972)
- Fixed key name for search request API param
- Rewrote actions to use &#39;redux-actions&#39;
- Added code to get and add program enrollments (#968)
- Removed signals creating or deleting a ProgramEnrollment (#964)
- Added some server side verification for profiles (#956)
- Added nationality, removed birth city and state (#961)
- Split long line into multiple lines (#962)
- Hooked up front end to mail API endpoint
- Added test case to mock out elasticsearch (#902)
- Switched Heroku to Python 3.5 (#959)
- Added API endpoint to send text email to a list of recipients
- Comments on PR
- Added link to ToS page
- Small comment change
- Fixed linting
- Added tests
- Added POST support for program enrollments
- fixed linting
- Added tests
- Changed docstring
- Added REST API for user enrolled programs
- Added celerybeat-schedule to gitignore
- Added new ToS page
- Added background task that run every 6 hours and update all MM users data from edx-platform (#771)
- Removed CLIENT_ELASTICSEARCH_URL environment variable (#947)
- Fixed react warnings, added check to error on React warnings (#942)
- Added generic type to Dispatcher (#945)
- Added validation for the email composition dialog
- Made some basic css changes (#887)
- Celery now loads the environment in Docker
- Removed switch validation from profile flow
- Added API to create an order and a button to purchase via CyberSource (#897)
- Removed &#39;new group from selected&#39; button
- Switched to use enzyme in IntegrationTestHelper (#911)
- Added functionality for composing emails on the LearnerSearch page
- Updated node version in heroku (#907)
- Implemented a sort dropdown menu for the Learners search
- Added CoursePrice model (#895)
- Implemented new design for the profile progress widget
- Added ecommerce models (#894)
- Made LearnerResult avatars round
- Added program grade filter and histogram to UI
- Fixed program and social username creation in realistic search data generation
- Moved material-design-lite CSS import before our CSS imports (#886)
- Added program grade to search result UI
- Set the cursor to &#39;pointer&#39; on the filter visibility toggle
- Added &#39;clear all filters&#39; to learner search
- Added UserChip to search results
- Fixed CSS for dashboard user card (#868)
- Fixed webpack hot-reload config
- Implemented redesign of dashboard page (#836)
- installed flow v0.30.0
- fixed JS console error (&#39;key&#39; prop required)
- Passed onRequestClose callback to ToS Dialog
- Added TermsOfServiceDialog to Profile flow
- Added security and tests to the Search Rest API
- Fix CSRF handling
- Added Search REST API
- Added widget for progress (#817)
- Added program grade to ES index to support filtering by grade
- Replaced filtering with hierarchical filtering (#815)
- Implemented new profile form design
- Updated realistic user data to include users with different current country and birth country
- Changed indexing structure and logic to use a user&#39;s program enrollments
- Enforced permissions on profiles REST API (#790)

Version 0.13.0
--------------

- Added celery start command to Procfile
- Added &#39;jump to error&#39; on profile forms
- Removed .name call on anonymous functions for createActionHelper
- Installed Searchkit and implemented basic learners search
- Added roles to SETTINGS (#783)
- Implemented ValidationAlert to alert user to problems in form dialogs
- Refactored `actions/index.js`
- Changed ProgramEnrollment with more efficient update
- Fixed a bug with clearProfileEdit
- Implemented new design for user menu
- Added bpython to test_requirements.txt
- Added ProgramEnrollments to dashboard
- Created management command to generated realistic-looking fake users
- Fixed signals for indexing Cached ceritficates and enrollments
- Mocked certificate to api in test suit to run even if edx instance is close/shutdown
- Added e-mail opt-in to user settings
- Added indexing for Certificate and Enrollment
- Modified caching logic: now all runs get an entry in the cache
- Added models for Enrollment and Certificate and code to populate them on dashboard load
- Added custom roles definition.
- Removed box-shadow from Navbar
- Implemented new navbar design
- Added new ProfileImage component
- Update to Django 1.9.8
- Refactored ProfileFormContainer to remove boilerplate
- Pinned html5lib to fix build (#722)
- Added Elasticsearch index, indexing for Profile and related models (#706)
- Updated validation state when editing fields
- Moved ErrorMessage tests into separate file
- Added get_social_username, updated existing code to use it (#705)
- Fixed bug where validation errors showed up on first login
- Changed getPreferredName to show last name
- Updated README with basic CMS docs (#688)
- Added celery, elasticsearch, redis

Version 0.12.0
--------------

- Added ErrorMessage to UserPage
- Changed dateFields to disallow non-numerical input (#641)
- Added deadline for upgrade
- Removed some (now) useless cases in constants
- Modified FAQ field to have rich text
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
- Added MIT MicroMasters graphic and updated title
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

