Release Notes
=============

Version 0.174.0 (Released November 05, 2020)
---------------

- Update populate_exam_coupons command to parse course number (#4671)

Version 0.173.3 (Released October 29, 2020)
---------------

- Added design changes for elective labels (#4663)

Version 0.173.2 (Released October 29, 2020)
---------------

- Bump wagtail from 2.8 to 2.9.3

Version 0.173.1 (Released October 27, 2020)
---------------

- Added table block in benefits page content (#4666)

Version 0.173.0 (Released October 26, 2020)
---------------

- Fix an incomplete sentence on the home page (#4665)

Version 0.172.0 (Released October 20, 2020)
---------------

- Bump lodash from 4.17.11 to 4.17.19

Version 0.171.3 (Released October 19, 2020)
---------------

- Limit the address field to 100 characters

Version 0.171.2 (Released October 14, 2020)
---------------

- Populate exam authorizations with coupon codes (#4651)
- upading iso-3166-2 branch to latest master branch's commit
- enhance validations for romanized fields

Version 0.171.1 (Released October 09, 2020)
---------------

- Adding instruction on adding electives to a program (#4655)

Version 0.171.0 (Released October 06, 2020)
---------------

- Configurable shard Count while creating index

Version 0.170.0 (Released September 23, 2020)
---------------

- Move proctored exams to edx (#4642)

Version 0.169.0 (Released September 11, 2020)
---------------

- update serialize-javascript version to fix the security alert

Version 0.168.0 (Released September 01, 2020)
---------------

- Fix the size of the SCHEDULE EXAM button (#4633)
- send ip address to cybersource

Version 0.167.0 (Released August 20, 2020)
---------------

- Added accessiblity link

Version 0.166.0 (Released August 13, 2020)
---------------

- Bump django from 2.2.10 to 2.2.13 (#4617)
- Bump jquery from 3.4.0 to 3.5.0 (#4613)
- Bump codecov from 3.6.5 to 3.7.1 (#4623)
- Bump elliptic from 6.5.2 to 6.5.3

Version 0.165.0 (Released July 21, 2020)
---------------

- fix an issue with the phone number validation

Version 0.164.0 (Released April 28, 2020)
---------------

- linkable wagtail images
- Rename UWSGI_THREAD_COUNT and UWSGI_PROCESS_COUNT, and remove redundant if-not-env blocks (#4601)

Version 0.163.0 (Released April 14, 2020)
---------------

- Temporarily remove uwsgi strict mode (#4598)
- Add uWSGI settings (#4569)

Version 0.162.1 (Released April 10, 2020)
---------------

- Configure sentry's python sdk to not capture SystemExit
- Mouseover highlight squished fix - #4574
- Warnings related to wagtail upgrade - #4563

Version 0.162.0 (Released April 09, 2020)
---------------

- upgrade raven to sentry-sdk
- Bump minimist from 1.2.2 to 1.2.3 (#4589)
- update zendesk widget

Version 0.161.3 (Released April 02, 2020)
---------------

- Youtube embed should be column width - #4581
- redirect cms login and forgot password pages to our site login page
- Add registered trademark to home page title
- Bump django from 2.2.9 to 2.2.10
- Bump codecov from 3.5.0 to 3.6.5
- Bump minimist from 1.2.0 to 1.2.2

Version 0.161.2 (Released March 31, 2020)
---------------

- Upgrade to latest redis (#4570)
- fix issue on /profile/personal

Version 0.161.1 (Released March 26, 2020)
---------------

- retire users by email
- Bump wagtail and Pillow

Version 0.161.0 (Released March 23, 2020)
---------------

- Update heroku Python runtime to 3.7 (#4540)

Version 0.160.2 (Released March 23, 2020)
---------------

- Mobile Home View: fix header name (#4558)

Version 0.160.1 (Released March 06, 2020)
---------------

- Downgrade redis to workaround https://github.com/andymccurdy/redis-py/issues/1274#issuecomment-580897258 (#4538)
- Update docker configuration (#4533)

Version 0.160.0 (Released February 28, 2020)
---------------

- Home page: login button fix (#4528)
- course team styling fix (#4529)
- Upgrade postgres verison in docker-compose (#4531)
- SendGrades: MIT comes first (#4500)

Version 0.159.2 (Released February 10, 2020)
---------------

- Prgram letter: print on one page (#4508)
- Fix FinalGradeAdmin timeout error (#4509)
- Upgrade node-sass to bump up tar to 2.2.2 (#4521)
- Fix styles for share and send grades dialogs (#4499)

Version 0.159.1 (Released February 04, 2020)
---------------

- Update webpack to v4 (#4510)

Version 0.159.0 (Released February 04, 2020)
---------------

- remove required constraint from title on course team page (#4514)

Version 0.158.2 (Released February 03, 2020)
---------------

- Fix program page styles (#4511)
- Upgrade Django, Wagtail, and jsonfield (#4501)
- course team update v2 (#4506)

Version 0.158.1 (Released January 30, 2020)
---------------

- Fix program page styles (#4511)

Version 0.158.0 (Released January 30, 2020)
---------------

- Tasawer/course team page (#4502)
- Update nyc to 15.0.0 (#4497)
- Upgrading material-ui to @material-ui/core (#4366)

Version 0.157.1 (Released January 22, 2020)
---------------

- Update CombinedFinalGrades when exam run gets updated (#4492)

Version 0.157.0 (Released January 13, 2020)
---------------

- Fixing the Grade record view (#4491)

Version 0.156.0 (Released January 02, 2020)
---------------

- Dashboard: fix elective tags (#4485)
- Bump django from 2.1.11 to 2.1.15 (#4488)
- Bump jquery from 3.3.1 to 3.4.0 (#4445)
- Bump mixin-deep from 1.3.1 to 1.3.2 (#4446)
- Bump lodash.merge from 4.6.1 to 4.6.2 (#4444)

Version 0.155.0 (Released December 19, 2019)
---------------

- Disable server-side cursors by default to avoid invalid cursor errors (#4481)

Version 0.154.1 (Released December 16, 2019)
---------------

- Updates to the program letter (#4480)

Version 0.154.0 (Released December 10, 2019)
---------------

- decrease the padding to allow for 3 signatures (#4477)

Version 0.153.0 (Released December 03, 2019)
---------------

- Splitting exam authorization task into smaller subtasks (#4473)
- Commendation Letter for FA program (#4458)

Version 0.152.0 (Released November 26, 2019)
---------------

- remove instructors carousel from course team tab page. (#4469)

Version 0.151.2 (Released November 21, 2019)
---------------

- Update phonenumbers lib

Version 0.151.1 (Released November 21, 2019)
---------------

- Fix styling of the Courses on program page (#4462)

Version 0.151.0 (Released November 19, 2019)
---------------

- Replace fax no with link to DocuSign (#4456)
- acknowledge admin and course team on program page (#4454)

Version 0.150.0 (Released November 18, 2019)
---------------

- #4455 Home: grow your network
- fix bg img on benefits page (#4452)
- add github templates copied from mitxpro (#4428)
- Added mmfin redirect
- HomePage: include information about the alumni benefits (#4434)

Version 0.149.1 (Released November 05, 2019)
---------------

- New Elective tags for program page (#4437)

Version 0.149.0 (Released October 31, 2019)
---------------

- fix flaky test (#4442)
- Add CMS BenefitsPage (#4432)
- Fix bug in anchor tag opening collapsed question (#4436)

Version 0.148.2 (Released October 21, 2019)
---------------

- Fix Non-Error exception issue

Version 0.148.1 (Released October 15, 2019)
---------------

- Add instructors, price, start_date, end_date, and enrollment_start to catalog API (#4420)
- Program Topics (#4419)

Version 0.148.0 (Released October 09, 2019)
---------------

- Full program page URL (#4416)

Version 0.147.1 (Released October 03, 2019)
---------------

- Re-remove course run api permissions

Version 0.147.0 (Released October 02, 2019)
---------------

- Revert "Revert "Upgrade to Elasticsearch 6" (#4408)" (#4409)
- Revert "Upgrade to Elasticsearch 6" (#4408)

Version 0.146.0 (Released September 25, 2019)
---------------

- Run Elasticsearch as elasticsearch user in Docker
- Update Elasticsearch index type for version 6
- Upgrade Elasticsearch to version 6

Version 0.145.0 (Released September 13, 2019)
---------------

- Allow blank edx_key

Version 0.144.0 (Released August 28, 2019)
---------------

- Updated python version in runtime.txt

Version 0.143.0 (Released August 21, 2019)
---------------

- Update redux and redux-asserts (#4396)

Version 0.142.3 (Released August 19, 2019)
---------------

- Add catalog API for discussions
- Add elective tags to program page courses (#4389)
- upgrade django ro 2.1.11 (#4391)
- Upgrade node-sass to 4.12.0 (#4392)

Version 0.142.2 (Released August 15, 2019)
---------------

- Freeze grades scheduling update (#4382)
- Mark courses as electives in Program Records (#4387)

Version 0.142.1 (Released August 12, 2019)
---------------

- update codecov (#4378)

Version 0.142.0 (Released August 08, 2019)
---------------

- Update handlebars to 4.1.2 (#4376)

Version 0.141.1 (Released July 26, 2019)
---------------

- Update Mocha (#4358)

Version 0.141.0 (Released July 25, 2019)
---------------

- Learner dashboard: elective courses (#4352)
- Adding models for course electives (#4349)

Version 0.140.2 (Released July 18, 2019)
---------------

- Add color to select-placeholder (#4344)

Version 0.140.1 (Released July 15, 2019)
---------------

- Verification email not sent email edx (#4345)
- Upgrde django to 2.1.10 (#4346)

Version 0.140.0 (Released June 24, 2019)
---------------

- Bump fstream from 1.0.11 to 1.0.12 (#4331)

Version 0.139.0 (Released June 11, 2019)
---------------

- Upgrading css-loader to get rid of js-yaml@3.7.0 (#4335)

Version 0.138.1 (Released June 05, 2019)
---------------

- Fix fetch user profile (#4332)

Version 0.138.0 (Released June 04, 2019)
---------------

- Bumped DRF version

Version 0.137.0 (Released June 03, 2019)
---------------

- Adding Google Tag Manager (#4328)

Version 0.136.1 (Released May 24, 2019)
---------------

- Let the workers use pgbouncer too

Version 0.136.0 (Released May 24, 2019)
---------------

- fix dashboard message for past end date course run (#4322)

Version 0.135.0 (Released May 07, 2019)
---------------

- Revert "bump elasticsearch version (#4303)"
- remove passed from course progress for staff view (#4315)
- use fork of iso-3166-2.js for Kosovo country (#4314)

Version 0.134.0 (Released May 06, 2019)
---------------

- rename wiledcard
- bump elasticsearch version
- Remove authentication from courseruns endpoint, and update test
- upgrade urllib (#4309)

Version 0.133.2 (Released April 30, 2019)
---------------

- Adds viewset for courseruns API, required serializer, and related tests

Version 0.133.1 (Released April 25, 2019)
---------------

- mark channel and percolatequery is deleted and update memeberships (#4289)

Version 0.133.0 (Released April 24, 2019)
---------------

- Fix formatting for SendGradesDialog.js (#4306)
- adding a management command to authorize users for expired exam runs (#4295)
- Adding Send dialog (#4284)

Version 0.132.1 (Released April 19, 2019)
---------------

- make program email subscription like dynamic (#4298)
- remove 0 courses from home page (#4300)

Version 0.132.0 (Released April 19, 2019)
---------------

- Added EXAMS_AUDIT_NACL_PUBLIC_KEY to app.json
- adjusted selenium database fixture and reverted test db name changes
- Switched exam result auditing encryption to NaCl
- use test_database for selenium tests
- update selenium images and version
- silence cov errors on build
- latest images pushed to dockerhub
- run fmt
- fix lint issues
- fix flow error
- revise dependcies
- revise dependcies
- images and dep update
- apply alice patch to resolve js tests
- removed celery worker from travis
- replace reset to clear for localstorage and session storage to fix js error
- Update to latest gnupg dep
- Bump travis version
- pytest and pytest-django  versions updated
- latest images added
- fix scss issue and upgrade yarn
- fix flow error
- update docker to use stretch

Version 0.131.1 (Released April 11, 2019)
---------------

- add 'program' after 'MITx MicroMasters' in footer (#4291)
- add 'program' after '

Version 0.131.0 (Released March 19, 2019)
---------------

- Fixed logic for program commendation letter creation

Version 0.130.0 (Released March 13, 2019)
---------------

- change log level form error to info
- remove extra mit logo

Version 0.129.2 (Released March 12, 2019)
---------------

- prioritize the syncing of channel memberships

Version 0.129.1 (Released March 08, 2019)
---------------

- fix migration dependency
- remove max validation from final grade
- Add support for congratulation letters for non-fa programs (#4263)

Version 0.129.0 (Released March 05, 2019)
---------------

- fix css on program page

Version 0.128.0 (Released February 28, 2019)
---------------

- Show Created Date in Grade Records (#4264)

Version 0.127.1 (Released February 25, 2019)
---------------

- rfc for congratulation letter on dashboard (#4258)
- add search, filter and fields to order admin list view (#4257)
- upgrade django to 2.1.7 (#4256)
- fix `next` parameter issue for /discussions (#4253)

Version 0.127.0 (Released February 20, 2019)
---------------

- add RFC template (#4255)

Version 0.126.0 (Released February 19, 2019)
---------------

- update docker compose file for local debugging
- show signup/login dialog, if user is not logged in

Version 0.125.0 (Released February 06, 2019)
---------------

- Share Program Records Link Dialog (#4242)

Version 0.124.1 (Released January 31, 2019)
---------------

- Add a letter grade to Program Grades (#4241)

Version 0.124.0 (Released January 30, 2019)
---------------

- add Completed program style (#4236)

Version 0.123.1 (Released January 28, 2019)
---------------

- allow link in table block

Version 0.123.0 (Released January 23, 2019)
---------------

- Upgrade Django and urllib3 (#4226)
- Fix exam messages when user has failed and passed course runs (#4234)
- Add edX logo to Program Record (#4230)

Version 0.122.0 (Released January 18, 2019)
---------------

- Few more trademark updates (#4228)
- add support for tables in program tab page
- clarify review steps before adjusted grades are imported (#4218)
- Program record view (#4204)
- Trademark updates (#4222)

Version 0.121.0 (Released December 17, 2018)
---------------

- fix: don't allow learners with a deleted exam run schedule an exam

Version 0.120.0 (Released December 04, 2018)
---------------

- Handle users who are inactive or have no profiles during populate_query_memberships (#4189)

Version 0.119.1 (Released December 04, 2018)
---------------

- add coupon message on dashboard
- add support for csv, remove delimeter used for tsv

Version 0.119.0 (Released November 27, 2018)
---------------

- add review time of 5 days to financial aid email (#4170)
- add README with coupon docs (#4181)

Version 0.118.3 (Released November 26, 2018)
---------------

- fix css issue on dashboard gradding popup

Version 0.118.2 (Released November 16, 2018)
---------------

- Upgrade Django and Wagtail (#4161)

Version 0.118.1 (Released November 07, 2018)
---------------

- upgrade requirements, including bumping edx-apl-client to 0.6.1 (#4171)

Version 0.118.0 (Released November 06, 2018)
---------------

- Upgrade requirements (#4147)
- make the missed payment deadline message work for all learners (#4162)

Version 0.117.1 (Released October 31, 2018)
---------------

- Update edx_api_client to 0.6.0 (#4165)

Version 0.117.0 (Released October 31, 2018)
---------------

- Dashboard state: Missed deadline for course in progress (#4163)
- Add future examruns check with current scheduling ones for calculating can_schedule_exam for a course (#4151)
- Added command to retire user (#4153)

Version 0.116.0 (Released October 10, 2018)
---------------

- Set discussions JWT cookie max age (#4155)

Version 0.115.2 (Released October 05, 2018)
---------------

- Added unenroll program(s) feature (#4084)
- Added student id on learners page for staff only use (#4148)

Version 0.115.1 (Released October 04, 2018)
---------------

- Handle exception in certification creation process (#4143)

Version 0.115.0 (Released October 02, 2018)
---------------

- Added course run and description to exam run (#4141)
- Changed the source of video on home page (#4145)
- improve certificates admin (#4136)

Version 0.114.2 (Released October 01, 2018)
---------------

- Updated package versions that have reported vulnerabilities

Version 0.114.1 (Released September 17, 2018)
---------------

- Oauth maintenance page on login (#4132)

Version 0.114.0 (Released September 14, 2018)
---------------

- profile admin improvements (#4129)

Version 0.113.0 (Released September 04, 2018)
---------------

- Update progress message for staff (#4123)
- add search and filter to coupon admin (#4125)
- Offer to pay after missed deadline (#4115)

Version 0.112.1 (Released August 31, 2018)
---------------

- Fix attribute error when running exam states (#4120)

Version 0.112.0 (Released August 29, 2018)
---------------

- Audited passed, then audited failed course (#4116)
- Remove IS_OSX check now that everyone is on Docker for Mac (#4112)

Version 0.111.2 (Released August 20, 2018)
---------------

- Remove call to ready() (#4110)
- improve program enrollments admin (#4099)

Version 0.111.1 (Released August 15, 2018)
---------------

- Show semester year in GradeDetailPopup (#4102)

Version 0.111.0 (Released August 14, 2018)
---------------

- Revert "Added mailgun unsub user support  (#4094)"
- Renamed FF for syncing updates to a separate one
- Add complete url to OPEN_DISCUSSIONS_REDIRECT_URL (#4106)
- Added exam authorizations on the base of final grade (#4083)
- Expose SESSION_COOKIE_NAME as env variable (#4095)
- Added mailgun unsub user support  (#4094)
- Only try to enroll learner if learner isn't already enrolled (#4069)
- protected final grade audit (#4068)
- Added provider and switch to User.username for JWT tokens

Version 0.110.0 (Released August 06, 2018)
---------------

- SESSION_ENGINE is not a required setting (#4096)
- use the raw id for user in admin instead of drop-down (#4088)

Version 0.109.2 (Released August 02, 2018)
---------------

- Revert "Added mailgun unsub feature (#4051)"
- Updated odc and switched to passing user.username

Version 0.109.0 (Released August 02, 2018)
---------------

- Update user as moderator when staff role is added or removed (#4077)
- update readme with details on how to adjust exam grades (#4037)
- Added mailgun unsub feature (#4051)
- Check if email is verified before creating account (#4076)
- Added partially refunded status (#4071)
- fix error in comment (#4067)

Version 0.108.2 (Released July 30, 2018)
---------------

- Show payment button when user has to pay (#4079)
- Fixed missing run issue on production (#4061)

Version 0.108.1 (Released July 23, 2018)
---------------

- Removed cybersource transaction key (#4054)
- Offer to pay again for exam when already passed (#4062)

Version 0.108.0 (Released July 17, 2018)
---------------

- Status message for paid but not enrolled (#4052)
- Fixed education and employment dialog titles (#4059)

Version 0.107.0 (Released July 09, 2018)
---------------

- add course_number &amp; allow filtering by program in course admin list view (#4058)

Version 0.106.1 (Released July 05, 2018)
---------------

- Loading session engine from env var (#4049)
- Fix semester user count bug (#4048)

Version 0.106.0 (Released July 02, 2018)
---------------

- Add space in FA Card (#4041)
- add line break in program page h1 (#4043)

Version 0.105.1 (Released June 27, 2018)
---------------

- Fix course certificate generation task (#4044)
- Message about exam when course run in progress (#4032)

Version 0.105.0 (Released June 26, 2018)
---------------

- Add exam states where course is in progress (#4035)
- slight header font size change (#4027)
- Update program page header (#4030)

Version 0.104.0 (Released June 21, 2018)
---------------

- Show exam message even when has enrollable runs (#4028)
- Pinned Dockerfile to python:3.6.4
- Skip exam authorization for inactive user (#4022)
- Add dashbaord state: failed and pending price (#4005)

Version 0.103.2 (Released June 14, 2018)
---------------

- Fix sentry error/exception logging (#4020)

Version 0.103.1 (Released June 12, 2018)
---------------

- Fix fonts and spacing on program pages (#4015)
- centered sign up/login buttons (#4017)

Version 0.103.0 (Released June 11, 2018)
---------------

- FEATURE_OPEN_DISCUSSIONS_USER_SYNC flag determines if discussions user is updated or not (#4010)
- Fixing 2 layout bugs in Micromasters Program page (#4013)
- Do not show upgrade button when learner has fail edX course (#4011)
- Fixed semester facet count issues (#4008)

Version 0.102.0 (Released June 01, 2018)
---------------

- Fixed regression on semester facet front end side (#4000)
- Fix index error for field program.enrollments.semester (#3998)
- Fix profile image upload layout on mobile (#3993)
- First step to update percolate queries that use enrollments nested field (#3995)
- Add users missing grades to the cached list (#3980)
- Added django-hijack for user masquerading (#3989)
- Serialize all semesters enrolled (#3963)
- Added multiple semester select (#3936)

Version 0.101.0 (Released May 21, 2018)
---------------

- Update edx-api-client to 0.5.0 (#3981)

Version 0.100.0 (Released May 17, 2018)
---------------

- Check freeze status show correct enrollment numbers (#3977)
- Fixed document deletion issue appears when user upload exact same document in edit view (#3974)
- fixing ipad layout bug (#3979)
- fix toast layout issue (#3978)
- Revert &#34;Check freeze status show correct enrollment numbers&#34;
- Check freeze status show correct enrollment numbers

Version 0.99.0 (Released May 07, 2018)
--------------

- Payment for courses not course run (#3545)

Version 0.98.1 (Released April 27, 2018)
--------------

- When user has a passed run but upgrade deadline passed (#3931)
- Updated heroku stack in app.js file (#3939)
- Style and layout tweaks to Micromasters program pages (#3956)
- Handle 503 error on dashboard api (#3957)
- Fixed status message of current/future course when status is missed upgrade deadline (#3937)
- Pin pytest to fix selenium issues (#3962)
- Rename footer link (#3960)
- display courserun dates in admin list view; make them editable (#3941)

Version 0.98.0 (Released April 23, 2018)
--------------

- add proctored exam grades to grades README (#3912)

Version 0.97.2 (Released April 20, 2018)
--------------

- unhide interested button on mobile (#3954)
- brighter font and better spacing in text over hero image (#3951)

Version 0.97.1 (Released April 19, 2018)
--------------

- If no courses show I&#39;m insterested button (#3950)
- Program Page: remove empty courses box (#3947)
- change grid from 3 columns to 2 or 4 depending on width (#3948)

Version 0.97.0 (Released April 19, 2018)
--------------

- Fix migration (#3942)
- sanitize requirements per pip 10
- Fixed selenium issues (#3935)
- Update README.md
- Remove final_grade from MicromastersCourseCertificate (#3920)
- Fix learner search page email send error
- Updated README to refer to common web app guide where appropriate

Version 0.96.1 (Released April 05, 2018)
--------------

- Added contact us link on mm footer (#3924)

Version 0.96.0 (Released April 02, 2018)
--------------

- Updating MicromastersCertificateModel to relate to User and Course (#3910)
- Add postal address to email footer (#3922)

Version 0.95.0 (Released March 28, 2018)
--------------

- Increased the buffer size in uWSGI to address wagtail errors (#3887)
- Remove User Chip on Learner Search Page (#3919)
- Add states for View Certificate and re-enroll (#3905)

Version 0.94.3 (Released March 23, 2018)
--------------

- Snapshots: add more failed course states (#3896)
- Redirect user to profile wizard if residence is missing (#3907)

Version 0.94.2 (Released March 22, 2018)
--------------

- Add email footer (#3909)

Version 0.94.1 (Released March 20, 2018)
--------------

- Add social auth data for all fake users (#3895)
- Add re-enroll button

Version 0.94.0 (Released March 19, 2018)
--------------

- Lint fix (#3902)
- Fix incorrect profile redirect behavior
- add .pytest_cache to gitignore
- Add back size parameter (#3893)

Version 0.93.1 (Released March 14, 2018)
--------------

- Fix n+1 warnings on dashboard API (#3886)
- Pin docker image versions (#3888)
- Make environment variable to control batch update throttling (#3889)

Version 0.93.0 (Released March 12, 2018)
--------------

- Remove accidentally committed empty file (#3885)
- Some copy changes for personalized pricing and coupons

Version 0.92.3 (Released March 08, 2018)
--------------

- Fixed celery startup under travis
- Override ALLOWED_HOSTS for snapshot states tests (#3882)

Version 0.92.2 (Released March 07, 2018)
--------------

- Schedule task to create CombinedFinalGrades (#3863)
- Upgrade to Django 2.0 (#3843)
- Add a link to the TOS in the footer
- Update Django REST Framework, django-server-status (#3873)

Version 0.92.1 (Released March 06, 2018)
--------------

- Fixes overlapping icons on Profile page (#3858)
- Upgrade to wagtail 2.0 (#3865)
- Dashboard: show certificate if user has it (#3871)

Version 0.92.0 (Released March 05, 2018)
--------------

- Fix date format
- Upgrade to Django 1.11 (#3855)
- CMS: Remove external program url (#3857)
- Fixes toast layout in mobile (#3859)

Version 0.91.2 (Released March 01, 2018)
--------------

- Snapshots: Add more PAID_BUT_NOT_ENROLLED states for FA program (#3860)
- Update pylint, django-webpack-loader and remove DeprecationWarning filter (#3849)

Version 0.91.1 (Released February 28, 2018)
--------------

- Fixed end date issues on progress messages (#3844)
- Use site_key in discussions JWT token

Version 0.91.0 (Released February 26, 2018)
--------------

- Update rolepermissions and social-auth-django-app (#3848)
- Added scroll api to fetch search code (#3846)
- Fix some deprecation warnings (#3847)
- Serialize best final grades for search (#3841)

Version 0.90.0 (Released February 22, 2018)
--------------

- Update emails and email optin flag of existing users in OD (#3836)
- Dashboard Snapshots: Add scenario for FA paid course run  (#3837)
- Lower elasticsearch memory usage limit (#3838)
- Snapshot Dashboard States: add more exam states (#3824)
- Upgrade Elasticsearch to same version used in production (#3831)
- Remove Elasticsearch 2.x code (#3823)
- Disable dynamic mapping (#3830)
- When creating discussion user, added email address to OD (#3822)
- Update update_docker_hub.sh to use a new hash for each image (#3781)
- Snapshots: Make exam related dashboard states use FA program (#3826)

Version 0.89.3 (Released February 09, 2018)
--------------

- Fix missing field (#3827)
- Forward port 7000 (#3821)

Version 0.89.2 (Released February 08, 2018)
--------------

- Fix percolate doc type for legacy index (#3818)
- fix financial aid skip UI bug
- Install certifi (#3815)
- count_courses_passed for courses with exams (#3809)
- Upgrade to Elasticsearch 5 (#3789)

Version 0.89.1 (Released February 08, 2018)
--------------

- Turn off codecov status updates (#3811)
- Synchronized email address with email address from edX (#3801)

Version 0.89.0 (Released February 06, 2018)
--------------

- Added CombinedFinalGrade model (#3791)
- Fix the course run popup status messages

Version 0.88.1 (Released February 01, 2018)
--------------

- restrict channel creation to superusers

Version 0.88.0 (Released January 30, 2018)
--------------

- Updating log config to quiet noncritical errors
- Displayed learner&#39;s exam eligibility for staff on profile page (#3792)

Version 0.87.1 (Released January 26, 2018)
--------------

- Fixed user trying to navigate to discussion if no user (#3736)
- Upgrade searchkit (#3763)

Version 0.87.0 (Released January 23, 2018)
--------------

- Updated create channel UI to handle backend errors (#3618)
- Use TimestampedModel base in channel and discussionUser models (#3773)
- Added course num to course model (#3774)
- Fix CourseRunStatus for course runs with fuzzy start date (#3771)
- add status message for course run with fuzzy start date (#3775)
- Pinned astroid to 1.5.3 to fix lints locally

Version 0.86.2 (Released January 19, 2018)
--------------

- Freeze grades every day (#3766)
- bump react-dropzone version to latest

Version 0.86.1 (Released January 18, 2018)
--------------

- Add command to create snapshots for learner search page (#3761)

Version 0.86.0 (Released January 16, 2018)
--------------

- larger max width on dashboard (#3758)
- Schedule freeze grades task (#3756)

Version 0.85.1 (Released January 11, 2018)
--------------

- Change layout of &#34;More Programs Coming Soon&#34; on Micromasters home page (#3754)
- Put persistence before middleware() to persist actions dispatched within async dispatchers (#3755)
- Update docstring (#3752)
- Freeze grades only for users that have cached current grade (#3747)
- Fixes the line height of course names in the course description popover on program page (#3751)

Version 0.85.0 (Released January 09, 2018)
--------------

- Don&#39;t create extra RedeemedCoupon objects if the coupon is not being applied (#3744)
- Use old year in help text (#3745)
- Switched create channel to new description field (#3715)

Version 0.84.1 (Released December 27, 2017)
--------------

- Two small tweaks to padding (#3729)
- Grades: Add usefull code snippets to README (#3726)

Version 0.84.0 (Released December 12, 2017)
--------------

- Change personal course pricing messages and buttons  (#3713)

Version 0.83.0 (Released December 07, 2017)
--------------

- fixes mobile layout issue with edit icons on profile page (#3717)
- bump psycopg to 2.7.2 (#3718)
- Fix run_snapshot_dashboard_states.sh to use new docker-compose files (#3716)

Version 0.82.1 (Released November 30, 2017)
--------------

- Count cache update failure for user (#3700)

Version 0.82.0 (Released November 29, 2017)
--------------

- Propagate 409 response from open-discussions when creating a channel (#3708)

Version 0.81.0 (Released November 17, 2017)
--------------

- Log failed send_automatic_email and update_percolate_memberships (#3707)
- fixes layout bug with radio buttons (#3706)

Version 0.80.1 (Released November 07, 2017)
--------------

- Reduce rate of batch_update_user_data (#3702)

Version 0.80.0 (Released November 06, 2017)
--------------

- Refactor celery locking (#3696)
- Disable re-enroll button for courses with future enrollment start date (#3703)
- Fixed an exception, happens when ZenDesk floating widget is not loaded (#3687)
- Make MICROMASTERS_LOG_LEVEL a required variable and set default to INFO (#3690)
- CourseCertificates: create if final grade is complete (#3683)

Version 0.79.3 (Released November 02, 2017)
--------------

- Conditionally hide course progress
- get final grade from current grades (#3675)
- Upgrade redux-hammock (#3662)

Version 0.79.2 (Released November 01, 2017)
--------------

- Added timeout to lock
- Fixed search do not expand every two-letter abbreviation into a country name (#3649)
- Refactor batch_update_user_data, fix lock behavior (#3670)
- Install pcyopg 2.7
- Remove unused redirects for development nginx configuration, fix buffer settings (#3673)
- Fix celery env vars for travis (#3672)
- Don&#39;t reference INSTALLED_APPS directly (#3674)
- Remove accidentally committed dependency (#3682)

Version 0.79.1 (Released November 01, 2017)
--------------

- Excluded users with no profile from open-discussions sync
- Use application log level for celery workers (#3685)

Version 0.79.0 (Released October 31, 2017)
--------------

- Reduced number of side effects from reindexing
- Log a diff of the ES document and serialized enrollment (#3657)
- Fixes a layout fix with radio buttons on the profile pages in Chrome (#3669)
- Doc about how to freeze final grades (#3658)
- Use yarn install --frozen-lockfile to error if upgrade needed (#3653)
- Refactor docker-compose.yml files (#3644)
- Use HEROKU_APP_NAME as ELASTICSEARCH_INDEX value for PR builds (#3640)

Version 0.78.1 (Released October 20, 2017)
--------------

- Update yarn.lock

Version 0.78.0 (Released October 19, 2017)
--------------

- Check if document needs updating before reindexing (#3636)
- Add payment deadline to course status (#3611)
- Removed recipient email variables from email composer (#3631)
- Delete some unused code
- Split CSS into separate file for production (#3637)
- Print formatting for program certificates (#3628)
- Fix error navigating between profile and learner search pages (#3612)
- Add creator as moderator (#3616)
- Make OPEN_DISCUSSIONS_COOKIE_NAME required (#3632)

Version 0.77.0 (Released October 11, 2017)
--------------

- Change course status in GradeDetailPopup to Auditing (#3586)
- Allow empty public_description (#3605)
- Update handling of the discussions frontpage API
- Fixed failed to execute getComputedStyle on Window error on zendesk script (#3624)
- Fix MAILGUN_KEY validation (#3623)
- Fixes layout but with button labels on Learner Search page and tweaks styling of Recent Posts card
- Upgrade eslint configuration and fix throw literal warnings (#3609)

Version 0.76.2 (Released October 06, 2017)
--------------

- Add validation for recipient variable tags (#3592)
- Move root logger to proper place (#3615)
- Raised an exception to sentry when course team e-mails fail (#3585)
- Make MAILGUN_URL and MAILGUN_KEY required values (#3600)

Version 0.76.1 (Released October 05, 2017)
--------------

- Fixed CORS redirect issue with discussions API (#3603)
- Redirect to new channel after creating it (#3589)
- Fix typo (#3596)
- Stagger SFTP operations to Pearson (#3593)
- Update logging configuration to show celery exceptions (#3591)
- Link channels to users and add all staff as moderators of channel (#3580)

Version 0.76.0 (Released October 03, 2017)
--------------

- Overall final grade for course (#3567)
- Generate MicromastersCourseCertificates only when exam grades are available (#3584)
- Change log.error to log.debug for USER_SYNC feature flag (#3576)
- Use transaction.on_commit to fix a race condition (#3563)
- Added message for future scheduled exams for learners who haven&#39;t taken an exam yet (#3558)
- Layout changes to the MM Program Certificate  (#3578)
- Change copy for clarity (#3571)
- Added create discussion channel ui (#3473, #3474)
- Changed noisy log.error to log.debug
- Return course certificate url only if course has signatories (#3559)
- Fixed discussions redirect to show user error page
- use common eslint config

Version 0.75.4 (Released September 29, 2017)
--------------

- Show program certificate on dashboard (#3546)
- Added repl (#3553)
- Move js_test.sh to match location in cookiecutter and other repos (#3554)
- Implement &#39;recent posts&#39; display on dashboard
- Add contributors when new channel is created (#3527)
- Remove afterImageUpload callback which was erroring and is unnecessary (#3552)
- Layout changes to the MM Program Certificate (#3561)
- Changed noisy log.error to log.debug

Version 0.75.3 (Released September 21, 2017)
--------------

- Add template for MM Program certificate (#3528)
- Add queryset for create channel API (#3534)

Version 0.75.2 (Released September 20, 2017)
--------------

- Add open discussions redirect URL to the SETTINGS object
- Add a really simple link over to discussions, behind a feature flag

Version 0.75.1 (Released September 19, 2017)
--------------

- Add prettier-eslint-cli, fiddle with eslint config
- See Certificates links for non FA courses (#3500)
- Added management command to backfill discussion users
- Generate MM Program Certificates (#3524)
- Updated open-discussions-client (#3529)

Version 0.75.0 (Released September 18, 2017)
--------------

- Add npm script for running tests in watch mode
- Added management command to backfill discussion users
- Added auth and session urls to JWT
- Add REST API to create channels (#3514)
- Added DiscussionUser model and code to sync it (#3479)

Version 0.74.0 (Released September 06, 2017)
--------------

- Filter on coupon id for automatic emails (#3509)

Version 0.73.1 (Released September 01, 2017)
--------------

- Delete failed users when course run grading status is complete (#3506)

Version 0.73.0 (Released August 31, 2017)
--------------

- Complete freeze final grades task when cache refresh fails (#3488)
- Fixed course upgrade deadline on learners page (#3501)

Version 0.72.1 (Released August 25, 2017)
--------------

- Add link to view certificates for FA courses (#3497)
- Added MicromastersCourseCertificate to django admin

Version 0.72.0 (Released August 22, 2017)
--------------

- Added task to generate course certificates
- Release 0.71.0
- upgrading iso-3166-2.js to 1.0.0 (#3491)
- Allowed learners to pay for a course run again if no exam attempts remain
- use our fork of iso-3166-2.js with English names for Israel&#39;s districts (#3487)
- Use MIDDLEWARE instead of MIDDLEWARE_CLASSES (#3466)
- Let user pay for a course if auditing (#3486)
- Pdpinch/remove price (#3482)
- Added MicroMasters-generated course certificates for FA courses
- Upgrade yarn (#3469)
- Fix occasional null reference error when running snapshot_dashboard_states (#3458)
- Redesigned learner page
- Remove unused watch link from nginx container (#3463)
- Move collectstatic into docker-compose (#3462)
- Allow learners to pay for exam attempts (#3457)
- Added nginx configs to increase header and body buffer size to address Issue#3453
- Added redux-asserts flow types (#3452)

Version 0.70.2 (Released August 02, 2017)
--------------

- Raise an exception if there are two social auth objects (#3445)

Version 0.70.1 (Released August 01, 2017)
--------------

- Fix duplicate social auth creation during log in (#3444)
- Fix CORS issue with hot reloading (#3446)
- Added factories to produce social auth for Users

Version 0.70.0 (Released July 31, 2017)
--------------

- Added --learner to take snapshots of learner info page (#3436)
- Upgraded requirement for server status
- Fixed issue when a user have more the one social auth objects (#3429)
- Put expiration date far into future (#3434)

Version 0.69.1 (Released July 27, 2017)
--------------

- Rewrote selenium suite in pytest style
- Refactored various factory classes and usages

Version 0.69.0 (Released July 25, 2017)
--------------

- Created management command to make exam grade adjustments
- Cleared filters of learner page on learner page link refresh (#3422)
- Fixed broken cms migrations

Version 0.68.3 (Released July 20, 2017)
--------------

- Allow user to enroll in a course if FA pending (#3419)
- Add no-sequences eslint rule (#3423)
- Dashboard API: displayed final grade if user has it and he missed the deadline. (#3417)

Version 0.68.2 (Released July 19, 2017)
--------------

- Added exam grade detail display

Version 0.68.1 (Released July 18, 2017)
--------------

- Fixed financial aid income dialog that was showing up twice (#3414)
- Remove geosuggest component, revert to dropdowns

Version 0.68.0 (Released July 17, 2017)
--------------

- Fixed jumbled text when entering text in search mail dialog in chrome (#3372)
- Some style tweaks on the marketing site  (#3408)
- Fix JS race condition in tests (#3403)

Version 0.67.1 (Released July 13, 2017)
--------------

- Bumped react-telephone-input version
- Made status text consistent with acceptance of faxed FA documents. (#3393)
- Specify course_end_date for makeRun
- Replace get_var with more specific variants (#3387)
- Displayed course price in staff view of learner&#39;s profile page (#3374)

Version 0.67.0 (Released July 12, 2017)
--------------

- Fixed management commands effected by celery upgrade
- Learners in Program Card (#3335)
- Remove fallback config code (#3386)
- Fix selenium test (#3391)

Version 0.66.0 (Released July 11, 2017)
--------------

- Disable selenium test with intermittent failures (#3389)

Version 0.65.0 (Released July 10, 2017)
--------------

- Add selenium test for login redirect behavior (#3381)
- Use local patches in selenium tests (#3379)
- - Extended Geosuggest to override the onInputBlur function &amp; geocode the input text. - Changed the location validation error message to &#39;City, state/territory, and country are required.&#39;
- Use specific hash seed (#3346)
- Fix course coupon program messages (#3345)

Version 0.64.0 (Released July 06, 2017)
--------------

- Remove accidentially commited file (#3377)
- Added command to diff dashboard_states screenshots
- Fixed email validation to deal with &#39;mailto:&#39;
- Clean up frontend code touching coupons (#3367)
- Integrated redux-hammock
- Populate exam_run for ProctoredExamGrades (#3361)
- Updateed the mailing address (#3362)
- Added selenium test for program page, refactored ProgramPageFactory (#3337)

Version 0.63.0 (Released June 28, 2017)
--------------

- Revert &#34;Fixed message for course-level coupon (#3281)&#34; (#3357)
- Fixed automatic email editing
- - If google maps api isn&#39;t loaded, use traditional select dropdowns for state and country. - Use &#39;(cities)&#39; instead of &#39;geocode&#39; with the Geosuggest component to filter out anything except actual cities/towns.
- Add No Calls massage to FA card (#3354)
- Prevent users from creating coupons on non-financial aid programs (#3347)
- Fix coupon selenium screenshots (#3343)
- Added selenium test for financial aid review page (#3334)
- Bumped yarn version to the latest pre-release
- Output vars for easier debugging (#3317)
- Updated logging level for Sentry client in Celery (#3338)
- Fixed message for course-level coupon (#3281)
- Add JSON output for course price and coupons API (#3323)
- Refactored some financial aid view tests to pytest style
- Moved over a few dialogs to `showDialog`, `hideDialog`
- Layout and style tweaks to the course card layout (#3328)
- Update the README for changes in selenium tests (#3333)

Version 0.62.3 (Released June 21, 2017)
--------------

- Fixed bug with weird grades coming from edx
- Fixed alter_data enrolled status and edX data freshness
- Upgraded Wagtail to 1.10.1
- Upgraded requirements and fixed some tests
- Implemented past course run display
- Upgrade to Celery 4.0 (#3245)

Version 0.62.2 (Released June 15, 2017)
--------------

- Upgraded chai and chai-as-promised
- Replaced state and country dropdowns with Geosuggest React component for profile education and employment forms.

Version 0.62.1 (Released June 14, 2017)
--------------

- Fixed encoding issue for binary audit files
- Take screenshots of financial aid (#3289)
- Added check for exam attempts (#2286)
- Use UserInfo in edx_api to get user data (#3304)

Version 0.62.0 (Released June 13, 2017)
--------------

- Use database templates for faster database restore during selenium tests (#3278)
- Use override_settings to use test index for management command (#3286)

Version 0.61.2 (Released June 09, 2017)
--------------

- Fixed mail dialog rich text editor jumbling up letters (#3290)
- Use is_passing in MMTrack (#3283)
- Implemented dashboard redesign
- Fixed preferred name behavior

Version 0.61.1 (Released June 07, 2017)
--------------

- Fixed travis node-sass install issue
- Fixed bug involving poorly configured TierPrograms used for testing
- Fixed Pearson exam date parsing bug
- Use test database when running snapshot_dashboard_states (#3257)
- Added redirect of mm.mit.edu to micromasters.mit.edu (#3268)

Version 0.61.0 (Released June 05, 2017)
--------------

- Upgraded some JS dependencies
- Added loader to learners search page (#3101)

Version 0.60.2 (Released June 01, 2017)
--------------

- Show recipients on email edit box (#3238)
- Rewrote two functions in lib/api.js to use async/await syntax
- Handle reuse_db option (#3247)

Version 0.60.1 (Released May 31, 2017)
--------------

- Fix selenium tests dev script to run all tests (#3256)
- Add script to use webpack dev server to serve javascript bundles (#3250)
- Added management command to take screenshots of dashboard states (#3242)

Version 0.60.0 (Released May 30, 2017)
--------------

- Upgrade to python 3.6.1 (#3236)
- Mail search now skips users without a profile (#3240)
- Upgrade pylint, treat warnings as errors, fix related errors (#3235)

Version 0.59.2 (Released May 25, 2017)
--------------

- Fix flaky selenium tests (#3234)
- Add function to calculate current time in UTC (#3229)

Version 0.59.1 (Released May 24, 2017)
--------------

- Add fake_user field to Profile (#3214)

Version 0.59.0 (Released May 23, 2017)
--------------

- Remove coupon course run code in frontend (#3225)
- styling on the Send Email form (#3207)
- Fixed anonymous user navigation issues (#3221, #3218)
- Fixed errant enrollment delete signal (#3211)
- Removed EXAMS_CARD_ENABLED logic so card always shows (#3002)
- Shown Coupons without code on order summary page (#3210)
- Renamed send button to Save Changes on automatic email edit button (#3219)

Version 0.58.3 (Released May 19, 2017)
--------------

- Fix migration and bug
- Fix lints
- Fixed bug involving exam no-shows
- Added missed flow flag

Version 0.58.2 (Released May 17, 2017)
--------------

- Fixed email composition styling
- Add test for filters being displayed when there are zero hits (#3204)
- Added test for filter titles (#3196)
- Added wait function (#3195)
- Update readme for selenium tests (#3201)
- Update edX cache only for active users (#3191)

Version 0.58.1 (Released May 17, 2017)
--------------

- Fixed # of Courses Passed facet disappearing (#3095)
- On pay now redirected users to checkout page instead of order summary for non FA programs (#3178)
- Fixed error with bucket reference (#3183)

Version 0.58.0 (Released May 15, 2017)
--------------

- Fixed email composiition dialog body loading
- Added learner-learner search page (#2512)
- Added label for num courses passed (#3095)

Version 0.57.9 (Released May 12, 2017)
--------------

- Added temporary message for FA final grades (#3176)
- CMS: Link ProgramCourse to Course (#3165)
- Prevent course run coupons from being created (#3171)
- Mail: Add Recipient Variables Toolbar (#3145)
- Use official selenium images (#3170)
- small css change (#3168)

Version 0.57.8 (Released May 09, 2017)
--------------

- Implemented basic display for the exam grade

Version 0.57.7 (Released May 08, 2017)
--------------

- Added signal to authorize for exams on order fulfillment (#3161)
- Bypassed order summary for non FA courses and redirect users to edX course enrollment page (#3135)
- small css change to headers on tab pages (#3149)

Version 0.57.6 (Released May 05, 2017)
--------------

- Fixed is_exam_schedulable to check schedule dates (#3150)

Version 0.57.5 (Released May 05, 2017)
--------------

- Fixed an issue with old ExamAuthorizations updating (#3146)

Version 0.57.4 (Released May 04, 2017)
--------------

- Fixed missing module column in exam auth export (#3142)
- Pass through code coverage environment variables (#3140)
- Fixed CourseRunFactory.edx_course_key against collisions (#3113)

Version 0.57.3 (Released May 04, 2017)
--------------

- Fixed exam auth operation on exam run update (#3133)
- Removed unused fields (#3085)

Version 0.57.2 (Released May 03, 2017)
--------------

- Populate ExamRun and update ExamAuth writers (#3085)
- Fix sending mails with automatic checked (#3126)
- Don&#39;t prompt for confirmation when running migrations locally (#3129)
- Firefox fixed email type radios (#3127)

Version 0.57.1 (Released May 02, 2017)
--------------

- Added ExamRun model and updated logic (#3085)
- Center align toast message (#3120)

Version 0.57.0 (Released May 01, 2017)
--------------

- Mail: Filter recipient variables (#3115)
- Fixed mobile view of FA calculator (#3116)
- Shown public_to_mm profiles when requesting user is enrolled in one of the programs where profile user is enrolled (#3102)
- some small tweaks to visual styles (#3119)
- Switched off is_public flag from financial_aid footer (#3121)

Version 0.56.2 (Released April 27, 2017)
--------------

- Added max height and scroll to Current residence (#3076)
- Implemented basic HTML capabilities for the email composer

Version 0.56.1 (Released April 25, 2017)
--------------

- Populate ExamProfile timestamp values and set not null (#3025)

Version 0.56.0 (Released April 24, 2017)
--------------

- Added timestamp fields to ExamProfile (#3025)
- Refactored course price frontend code (reducer and so on) to use redux-rest
- Exams: Updated Pearson TOS text (#3098)
- Added page titles all over the MM app (#3081)

Version 0.55.3 (Released April 21, 2017)
--------------

- Restored final grade histogram for selected courses in learner search
- Fixed ProgramFactory price values (#3093)

Version 0.55.2 (Released April 20, 2017)
--------------

- Pin selenium container to a non-broken version
- Fixed typos in terms of service (#3090)
- Fixed bug with freeze grade management command not using the right value in a call

Version 0.55.1 (Released April 19, 2017)
--------------

- Fixed alter_data payment and grade issues, and cleaned up docs
- Fixed issue where date change is empty (#3082)

Version 0.55.0 (Released April 18, 2017)
--------------

- Pinned pylint deps
- Added EXAM file processing (#2791)
- [Regression] Fixed recipient keys on email composition dialog (#3074)
- Removed Edit Photo from Sidenav. Also, link user photo to profile. (#3075)
- Search: fixed error message, when there are no results (#3073)

Version 0.54.3 (Released April 14, 2017)
--------------

- CMS: increased file upload size of a document (#3065)
- CMS: Text changes to Future Semester Dates section (#3066)
- Fix race condition resulting in multiple emails sent (#3053)
- Preserve search URL on reload (#3061)
- Fixed course contact message for non fa courses (#3062)

Version 0.54.2 (Released April 13, 2017)
--------------

- Added tables to database for country code and country sub division look-ups (#3014)
- Refactored course enrollments API to use redux-rest

Version 0.54.1 (Released April 12, 2017)
--------------

- Fixed menu icon display when user is logged out (#3056)
- Added auditing of exam-related files (#2896)
- Added ability to edit emails on the email admin page
- Add mail_id and template variables to Mailgun functions (#3019)

Version 0.54.0 (Released April 11, 2017)
--------------

- Fixed faulty course ordering in search facet
- Fixed selected search filter label regression (#3042)
- Fixed handling of currently active email dialog on page without config (#3044)
- Exams: Removed FEATURE_SUPPRESS_PAYMENT_FOR_EXAM feature flag (#3020)
- Save and restore database between tests (#3031)
- Fixed promise error handling
- Upgrade postgres-client (#3029)

Version 0.53.12 (Released April 10, 2017)
---------------

- Implemented AutomaticEmail admin page
- Bumped the flow-bin version @latest
- Add specific environment variables to tox.ini instead of using * (#3024)
- Modified the mmtrack has paid to better handle FA programs
- Fixed unexpected course enrollment counts/results in learners search

Version 0.53.11 (Released April 07, 2017)
---------------

- Mail: displayed search filters as recipients (#2992)
- Search: Fix SelectedFilters titles (#3006)
- Remove deprecated object handling code for Celery tasks (#2985)

Version 0.53.10 (Released April 06, 2017)
---------------

- Pass object ids to Celery tasks instead of objects (#2984)
- Use reverse nested aggregation for education and fix related tests (#3010)
- Added UI for email composition type (#2961)

Version 0.53.9 (Released April 05, 2017)
--------------

- Set thumbnails to null if main image is null (#2999)
- Upgraded celery to 3.1.25 as 1st step to migrate to celery 4
- Progress widget: Removed apply for master button and text (#2996)

Version 0.53.8 (Released April 03, 2017)
--------------

- Remove remove_user (#2982)
- Do percolate on document instead of document id (#2980)

Version 0.53.7 (Released March 31, 2017)
--------------

- Bringing back the runtime to python-3.5.2
- Implemented AutomaticEmail API
- Unmarked some files as executable
- Switched library for python social auth
- Refactored course price API to take a &#39;username&#39; parameter
- Fixed seed data for naive timestamps (#2712)

Version 0.53.6 (Released March 29, 2017)
--------------

- Fixed bug with grade in case the grade is 0
- Add refresh_index to fix race condition with percolate (#2960)
- Fixed lint for dashboard/utils that did not appear because of parallel changes
- Update UserProgramSerializer to use current enrollments and existing grades (#2945)
- Fixed Order Summary text (#2962)
- Implemented Redux REST wrapper
- Added program.price, removed CoursePrice (#2956)
- Modified dashboard rest API to return proctorate exam grades

Version 0.53.5 (Released March 28, 2017)
--------------

- PR fix
- merge fix
- Added helper method for determining if user paid for any course run in a program
- Renamed &#39;course_id&#39; to &#39;edx_course_key&#39; etc
- Moved FA serialization from MMTrack to separate class
- Got rid of pearson exam status variable setting in init
- Cleaned up MMTrack final grade code
- Revert &quot;Fixed Order Summary text&quot;
- Fixed Order Summary text

Version 0.53.4 (Released March 24, 2017)
--------------

- Enroll and pay later: Load dashboard page without reloading (#2821)
- Added full name search support (#2940)
- Added model and admin for Proctorate Exam Grades
- Changed course description to show: Auditing or Paid (#2936)

Version 0.53.3 (Released March 23, 2017)
--------------

- Fixed bug with gdm_grade_task_fail_bug management command

Version 0.53.2 (Released March 22, 2017)
--------------

- Removed &#39;view on edx&#39; link for staff (#2925)
- Refactored course price API frontend code to namespace on username
- Upgrade yarn (#2920)
- Generate robotic avatars (#2910)
- Create thumbnails in Profile.save (#2903)

Version 0.53.1 (Released March 21, 2017)
--------------

- Upgraded sanctuary to latest version

Version 0.53.0 (Released March 20, 2017)
--------------

- Added dialog before opening pearson site (#2865)
- CMS: Added Semester Start Dates
- Show image upload only for logged in user (#2919)
- Gray, not grey (#2902)
- Improve disabled UI buttons (#2901)
- Fix refresh loop on learner page (#2906)
- More small UI layout tweaks for Mobile etc (#2897)
- Reindexed search on adding or deleting user role (#2869)

Version 0.52.3 (Released March 17, 2017)
--------------

- Removed feature flag code related to the final grade algorithm
- Added message for failed edx cache refresh
- Optimized the exam status query in MMTrack
- Added average grade to the staff view of the Learner page

Version 0.52.2 (Released March 16, 2017)
--------------

- Modified Dashboard REST API to include edx data freshness status
- Update requirements from pip-compile (#2884)
- Fixed alter_data commands to work with FA programs and added states
- Fixed lifecycle handling of DashboardPage to reload cleared items (#2880)
- Restrict pay now button to when financial aid is in terminal state (#2877)
- Various small style tweaks (#2874)

Version 0.52.1 (Released March 15, 2017)
--------------

- Upgrade Wagtail to 1.9 (#2832)
- Load the edX logo from CloudFront on the program page (#2839)
- Improve searchkit query (#2868)
- Fixed financial aid application review link on nav drawer
- Added validation for invalid name chars (#2837)
- Fixes layout issue with schedule an exam button (#2863)
- Add UI to send automatic emails for learner search (#2727)
- Upgraded some JS dependencies 🆙
- Sent emails when new user fills out profile and their profile matches query (#2782)
- small tweaks (#2866)
- Use temporary index during recreate_index (#2845)
- Enabled learner-to-learner emails
- Updated required yarn version in readme file (#2864)

Version 0.52.0 (Released March 13, 2017)
--------------

- Added course history display to staff view of learner page
- Fixed small searchkit bug
- Final Grade Facet for Selected Course
- Refactored profile validation for better scalability
- Removed send_bcc (#2848)

Version 0.51.3 (Released March 10, 2017)
--------------

- Add logging for recreate_index (#2843)
- Implemented new navigation design
- Allowed users to expand/hide search facets by clicking facet title (#2777)
- fixes layout issue (#2840)

Version 0.51.2 (Released March 09, 2017)
--------------

- Add transaction.on_commit on signals (#2835)
- Change date format to be globally accessible (#2826)
- Fixed various profile field validations for exams (#2804)
- Refactor MailgunClient for better error handling (#2775)
- Fix exam auth eligibility date handlinng (#2814)
- Reintroduce new course enrollment UX (#2802)
- Freeze grade modified to be race condition safe

Version 0.51.1 (Released March 08, 2017)
--------------

- Modified management commands for grades
- Change VCDC processing to treat warnings as errors
- Fixed layout user card safari (#2710)
- Patch search.tasks instead of search.indexing_api (#2793)
- Force logout before login after a 400/401 error from rest API
- Load CSS URLs through Django template (#2734)
- Fixed intermittent JS errors (#2818)
- Fixed erroneous logging of ExamProfile.status (#2783)
- Fixed JS test script to correctly match test files
- Fixed issue with &#39;/learner&#39; page
- Added staff-to-learner email with link in learner chip

Version 0.51.0 (Released March 07, 2017)
--------------

- Filter out zendesk errors (#2800)
- Fixed authorization_user_exam to authorize and not error (#2796)
- Fixed faulty ui view tests
- Added StaffLearnerInfoCard
- Configured JS test script to allow for specific test cases to be run

Version 0.50.0 (Released March 06, 2017)
--------------

- Moved Elasticsearch connection management to own module (#2789)
- Search: Included username and e-mail address in name search (#2729)

Version 0.49.5 (Released March 03, 2017)
--------------

- Added feature flag for showing exam card (#2769)
- Switched FinalExamCard to use the romanized names, if present
- Fixed TSV parsing to handle parsing errors (#2761)
- Fixed phone numbers handling for pearson
- Fixed postal code validation
- small change to size of search box on learner page (#2762)

Version 0.49.4 (Released March 03, 2017)
--------------

- Fixed dashboard UI to correctly display upgradable past course runs
- Removed error message if there are no enrollments (#2754)
- Upgraded searchkit to latest beta (#2741)
- Missed one
- Add trailing comma to tuple
- Fixed EOFError (#2753)

Version 0.49.3 (Released March 02, 2017)
--------------

- Added handling of can-upgrade status for past courses
- Release 0.49.2
- Revert &quot;New course enrollment UX (#2519)&quot;
- Fixed the name display on the final exam card
- Use searchkit from props instead of storing it in redux (#2724)
- Updated mail API to support automatic emails (#2728)
- Fixed profile validation
- Refactored profile form container into an HOC
- Removed program.email_optin from ES index (#2730)
- Modified user dashboard to handle 400 and 401 http errors

Version 0.49.2 (Released March 01, 2017)
--------------

- Revert &quot;New course enrollment UX (#2519)&quot;
- Fixed the name display on the final exam card
- Use searchkit from props instead of storing it in redux (#2724)
- Updated mail API to support automatic emails (#2728)
- Fixed profile validation
- Refactored profile form container into an HOC
- Removed program.email_optin from ES index (#2730)

Version 0.49.1 (Released March 01, 2017)
--------------

- Added PercolateQuery model (#2701)
- Frozen grades enabled by default in tests
- Fixed ExamProfile lookup query (#2716)
- Search: Added states/regions to search results for US learners (#2713)
- Fix deepequal test (#2726)
- Style changes to the Learner Search page (#2688)
- New course enrollment UX (#2519)
- Fix flaky test (#2715)
- Added setting for Django Storage to use Cloudfront for S3 files (#2711)

Version 0.49.0 (Released February 27, 2017)
--------------

- Refactored dashboard reducer to support multiple users
- Fixed search filtering involving query parameters (#2691)
- [financial_aid/review]Created financialaidaudit objects when financial aid status is changed through ui (#2695)
- Upgrade Django to 1.10.5 (#2698)
- Removed excessive logging from MMTrack

Version 0.48.1 (Released February 23, 2017)
--------------

- Fixed coupons to check enrollments instead of certs (#2561)
- Added search test (#2663)
- Implement str(CouponInvoice) (#2664)
- Moved sorting UI to column headers (#2667)
- Use babel-plugin-istanbul to fix coverage (#2681)
- Upgraded a few JS dependencies ⬆🆙
- Fix import (#2677)
- fixed small problem with an empty block in css
- Fixed tests
- more variables and added program selector border
- Moved dashboard reducer and actions to separate files
- Financial Aid: Allowed course team to reset students financial aid review form (#2656)
- Added logic to allow upgrade after frozen grades
- Comments on PR
- Added field to FinalGrade to save if user paid on edx
- Add validate_db to README
- added color variables and lightened font colors
- some small changes
- added cursor style
- style changes to sidebar

Version 0.48.0 (Released February 22, 2017)
--------------

- Refactored dashboard API to support getting dashboard for other users
- Added redis django cache backend
- Modified financial aid tasks
- Validate prices and FA discounts management command
- Pinned pytest-pylint because of weird behavior of 0.7.0
- Redirect favicon.ico
- Check for open exchange API URL before requesting it (#2557)
- Moved iPython to requirements.txt
- Rearranged facets (#2655)
- Use testindex when running selenium tests (#2658)
- Use travis docker image (#2648)
- return a 204 on requests for dnt-policy.txt (#2635)
- Exams: Added environment variable to suppress payment requirement (#2640)

Version 0.47.3 (Released February 17, 2017)
--------------

- Reduced MAX_AGE for PG connections to 0 (#2219)
- Don&#39;t send email on order cancellations, ignore duplicate cancellations (#2547)
- Added person search (#2562)
- Add link to grid for selenium container (#2645)

Version 0.47.2 (Released February 16, 2017)
--------------

- Added runtime feature flags via cookie (#2558)
- Exams: HTML edited to exam card on dashboard (#2637)
- Refactored email front-end code to use HOC pattern
- Make separate selenium container for tests (#2634)
- Fixed &#39;ready to schedule&#39; display for FinalExamCard
- Round to the nearest cent, formatPrice util (#2541)
- Added program title to dashboard (#2572)
- Personal Pricing: Added validation on income so that it can only be an integer (#2559)
- Respect DNT request header (#2280)

Version 0.47.1 (Released February 15, 2017)
--------------

- Lower logging of unexceptional exception to debug
- create pyup.io config file (#2482)
- Update html5lib from 0.999999 to 0.999999999 (#2483)
- Added Confirm Income dialog (#2536)

Version 0.47.0 (Released February 14, 2017)
--------------

- Added certificate status to check if user passed course
- Added robots.txt file (#2540)
- Fixed exam util tests for v0 and v1 (#2544)
- Added selenium testing (#2511)

Version 0.46.2 (Released February 10, 2017)
--------------

- Added exception chaining for FreezeGradeFailedException (#2503)
- Add coupon invoice table (#2543)
- Skip if the status is not terminal (#2533)
- Fixed exam authorization command and refactoring (#2448)

Version 0.46.1 (Released February 08, 2017)
--------------

- Validate exam profile
- Created dialog for course team contact payment teaser
- Marked required PR sections
- CoursePrice.price is a decimal (#2522)
- Renamed UserPage -&gt; LearnerPage
- Added VCDC/EAD file processing (#1797, #2080)
- Impelemented SSO for Pearson
- Refactor DashboardPage (#2509)
- Fixed signals for exam authorization trigger (#2457)
- Added TSV tasks to celery crontab (#2496)
- Added tranformation for exam profile state (#2486)
- Fixed bug with extracting final grade for not_passed courses
- The Frozen grade should be taken in account before enything else in case they exist

Version 0.46.0 (Released February 07, 2017)
--------------

- Fixed ES search result email bug
- Scope enrollment under program (#2515)

Version 0.45.0 (Released February 03, 2017)
--------------

- Cap coupon-adjusted price to between 0 and the full price (#2498)
- Added fixed price coupon support (#2436)
- Enroll user after a $0 purchase (#2494)
- Alert anonymous user if they try to use a coupon (#2459)
- Fixing code to run with v1 grades agorithm
- Fixed CoursePrice and TierProgram handling in seed_db (#2484)

Version 0.44.0 (Released February 02, 2017)
--------------

- Show Coupon code on OrderSummary page
- Updated ⬆ webpack to version 2.2.1 👌
- Added course contact email link to the student dashboard
- Implemented coupon messaging (#2453)
- Gs/more eslint rules (#2476)

Version 0.43.0 (Released February 01, 2017)
--------------

- Pearson SSO callback views (#2472)
- Show coupon discount on OrderSummary page
- Configure pylintrc to be more accepting (#2466)
- Use dict comprehension and set comprehension (#2461)
- Added new dashboard behavior if user has 100% program coupon
- Correctly export user profiles with blank romanized name fields (#2465)
- Freeze grade sync in case the course run has already frozen grades.
- Implemented front-end course contact email API
- Added dashboard card for final exams
- Display toast notification for API failure (#2430)
- Removed foo: Function annotations
- Don&#39;t needlessly set a `next` query param (#2458)
- Changed front-end handling of emails
- Added course team contact email API endpoint
- Added Summary Page before checkout (#2425)
- Bumped yarn, node-sass, sass-loader versions
- Add unique constraint on coupon code (#2442)
- Added audit models for Coupon, UserCoupon, and RedeemableCoupon (#2401)
- Attach user to coupon (#2392)
- Redeem coupon during checkout (#2388)
- Don&#39;t render closed Toast (#2437)
- Remove readonly_fields for Coupon admin (#2402)
- Display coupon-discounted prices in UI (#2431)

Version 0.42.0 (Released January 25, 2017)
--------------

- Add handling for next parameter (#2406)
- Removed 13px Adwords iframe height and added Adwords tags to only home page and program page (#2410)
- Used FinalGrade model to fetch final grade info on mmtrack
- Add setting to disable webpack loader functionality for tests (#2417)
- Changed the `crossOriginLoading` option for webpack
- Added base reader class for Pearson TSV responses
- Release 0.41.1
- Past enrolled courses need to be under feature flag (new)
- Fixed /learner -&gt; /learner/username redirect
- Past enrolled courses need to be under feature flag (new)
- Revert &quot;Merge pull request #2413 from mitodl/fix_enrolled_regression_2412&quot;
- Past enrolled courses need to be under feature flag
- Added test that REST API updates modification datetime (#2398)
- Added logic to calculate prices including coupons on frontend (#2378)
- Mocked ES in most tests
- Added SFTP env vars to app.json
- Ensured that the Toast component is always visible
- Triggered exam authorizations when users enrolled or passed course (#2331)

Version 0.41.1 (Released January 23, 2017)
--------------

- Past enrolled courses need to be under feature flag (#2413)

Version 0.41.0 (Released January 19, 2017)
--------------

- Updated realistic user and program data to add more fake users
- Fixed seed_db commands to work with indexing/grade changes
- Refactored Pearson code to separate functionality
- Fixed copyright date (#2374)
- Added a toast message when we redirect for missing profile data
- Fixed bug with scroll to error when profile page mounts
- Added Facet by Company (#2261)
- Implemented $0 checkout (#2367)
- Fix intermittent test failures (#2370)
- Added coupon APIs (#2250)
- Added test for auto migrations (#2365)
- Fix toast message loop (#2366)
- Added boilerplate for coupon APIs (#2358)
- Capture user&#39;s full address (#2308)
- Replace hardcoded Adwords Conversion ID with variable reference (#2362)
- Added telephone input to profile
- Fixed a bug on the profile with setting the program
- Moved test constants out of `constants.js`
- Added timestamps for Coupon-related models (#2330)

Version 0.40.0 (Released January 17, 2017)
--------------

- Filtered out coupons redeemed by another user (#2327)
- Fixed infinite loop in profile validation (#2344)
- Fixed unused variable linting error
- Fixed missing pagination in learner&#39;s search
- Added Adwords Remarketing Tag Insertion (#2263)
- User can pay after course run has finished.
- Fixed tests
- Deleted .babelrc
- Added functions for checking redeemable coupons (#2289)
- Added UserCoupon, removed num_... fields, added helper properties (#2282)
- sudo: false for Travis CI (#2311)

Version 0.39.2 (Released January 12, 2017)
--------------

- Fixed unused variable linting error (#2338)

Version 0.39.1 (Released January 12, 2017)
--------------

- Fixed missing pagination in learner's search (#2337)

Version 0.39.0 (Released January 11, 2017)
--------------

- Use factory.Faker() (#2306)
- Test learner search against null/undefined props
- Add --reuse-db flag to speed up running tests locally (#2309)
- Change status for enrollment to audit, since it&#39;s used in FA programs (#2290)
- Fixed learner search for DEDP fails issues (#2287)
- Don&#39;t need to make pylint disable missing-docstring for serializer Meta (#2300)
- remove extraneous about_me serializer fields (#2296)

Version 0.38.0 (Released January 09, 2017)
--------------

- Upgrade test dependencies (#2269)
- README badge for Travis CI (#2292)
- Added exam authorization export to Pearson (#2076)
- Use address type rather than geocode type (#2291)
- Added Facet by Degree
- Fixed progress widget ignores prior (passed) runs issue (#2274)
- Document how to get a Google API key (#2267)
- Address field with Google Places Autocomplete (#2167)
- For staff mail to learners, pointed the return address to be help desk (#2206)
- Added course semester facet
- Change default log level to INFO (#2255)
- Added NODE_MODULES_CACHE (#2259)
- Upgrade Ramda to 0.23 (#2257)
- Fixed test names (#2251)
- Add image_medium to ProfileLimitedSerializer (#2205)
- Updated alter_data commands and fixed various issues
- Split up URLs into respective apps (#2246)
- Fixed casing on CCD column name
- Show spinner only on currently active button (#2228)
- Installed eslint-plugin-mocha
- Remove LinkedIn integration (#2231)
- Added find_test.sh (#2239)
- Ask users with non-Latin names to enter a Latin first name and last name (#2215)

Version 0.37.0 (Released January 03, 2017)
--------------

- Use image_medium for profile images (#2225)
- Added infrustructure for feature flags
- Remove CELERY_ALWAYS_EAGER overrides where it already matches the default (#2226)
- Implement lazy loading for UserChip (#2220)
- Added APIs, tasks and management commands to compute final grades
- Added image_medium field to model and REST API (#2218)
- Fixed layout of profile page (#2208)
- Updated redirect to preserve request URI (#2166)
- Added export tasks for Pearson profiles (#1795)
- Check for OSError during image migration (#2217)
- Added slug to FrequesntlyAskedQuestion (#2191)
- Change range to start with 1
- Lint
- Update factory
- Update factories
- Lint
- Remove redundant words
- Validation
- Validations
- More validations
- Add back migration
- Remove UserCoupon from admin
- Remove UserCoupon
- Use PositiveIntegerField
- Validation
- Remove redundant words
- Change disabled to enabled
- Add activation_date
- Use help_text
- Rename num_redemptions
- Remove migration
- Add factory, test
- Validation
- Lint
- Use GenericForeignKey
- Add migration
- Remove product_type
- Add available_redemptions to __str__
- Review comments
- Change everything
- WIP
- Don&#39;t use type which is a builtin type
- Added model for Coupon
- Wagtail 1.8 (#2185)
- Don&#39;t make a new Mock, use one already present
- Fix test
- Fix parameterized test
- Test for path too long
- Remove extra seek
- ValueError
- autospec
- Store a smaller version of the avatar
- Fixed a bug with startProfileEdit
- Added more Google Analytics events

Version 0.36.0 (Released December 22, 2016)
--------------

- Added access control header for static assets (#2197)
- Fixed errors when viewing profile as anonymous user (#2193)
- Changed travis JS Dockerfile back to inheriting from mm_watch_travis

Version 0.35.0 (Released December 22, 2016)
--------------

- Updated yarn to 0.18.1
- added video to home page
- Added two babel plugins for a little react performance boost
- Moved the zendesk widget &lt;script&gt; tag
- Notified user when enrollment status doesn&#39;t match paid status (#2048)
- Remove debug static conf
- Add prepending slash, remove args
- WIP
- Add back args
- Remove static asset handling for dev environments
- Remove webpack, use *~
- Revert
- Revert args remove
- Add back static-map
- Remove $args
- Remove staticmap
- Add it back
- Remove static line from uwsgi.ini
- Use staticfiles

Version 0.34.0 (Released December 21, 2016)
--------------

- Fix django template comment (#2177)
- Added Facet on number of courses completed (#2133)
- Clean up how API keys are passed into templates (#2161)
- Switched to Yarn for JavaScript package management
- Deleted some checked-in JavaScript dependencies
- Removed foo: Function = () =&gt; style annotations
- Moved NON_LEARNERS inside Role class (#2154)
- Created course payment status facet
- Fixed a bug with deleting work history entries
- Remove gravatar-related code (#2144)
- Added add_past_passed_run command in alter_data (#2119)
- Added minimal .editorconfig
- Use dialogActions for photo upload dialog (#2143)
- Disable skip financial aid button during API activity (#2130)
- Changed CourseSubRow to show grades for prior passed courses
- Disabled send button during Email (#2136)
- Disable employment and education delete buttons during API activity (#2129)
- Disable document sent button during API activity (#2108)
- Disabled enroll in new program save button during API activity (#2110)
- Disables financial aid application button during API activity (#2109)

Version 0.33.0 (Released December 15, 2016)
--------------

- Updated app to proxy requests through Nginx (#2063)

Version 0.32.0 (Released December 15, 2016)
--------------

- Correct spacing for course search facet (#2125)
- Made function for dialog actions (#2118)
- Added ECOMMERCE_EMAIL setting, added decision to email subject (#2103)
- Disabled Pay Now button during API activity (#2067)

Version 0.31.0 (Released December 14, 2016)
--------------

- Made twitter description tag shorter (#2083)
- Disable enroll and pay later button during API activity (#2056)
- Added cropper to object types (#2114)
- Fixed race condition with getCroppedCanvas
- Replace utcnow() with now(tz=pytz.UTC) (#2107)
- Fixed &quot;View on edx&quot; links to wrong URLs (#2073)
- Ensured that search query is reset when changing programs
- Added do not set income tax statement by email instruction message (#2091)
- Limited the birth country facet to 15 options
- Display tagline on mobile (#2085)
- Filter out *_test.js files from test coverage (#1968)
- Replace Object.assign with spread syntax (#2069)
- Changed to https-only in npm-shrinkwrap
- Fixed faulty hiding for facets that use nested fields

Version 0.30.1 (Released December 13, 2016)
--------------

- Removed eslint rule disables on entry/public.js
- Check for cross-domain security for Zendesk widget (#2075)

Version 0.30.0 (Released December 12, 2016)
--------------

- Made the profile gender radio buttons more accessible
- Refactored task code to refresh users edX data.
- Remove react-sticky (#2046)
- Fixed search facet left indentation
- Updated Facebook sharing image
- fixes minor layout issue
- Disable buttons during profile upload for about me and personal info dialogs (#2042)
- Limited profile image size on the client to 512x512
- Prevented the user from issuing multiple image upload requests
- this should do it
- Disable buttons on employment and education dialogs during profile update (#2033)
- Used render methods for tests, use sandbox for sinon (#2045)
- svg logos added with error

--------------

- Revert &quot;Changed profile validation to not require a photo&quot;


Version 0.29.0 (Released December 09, 2016)
--------------

- Created course facet to filter learners by course enrollment
- Open external links in new tabs on public pages (#2021)
- Disabled buttons on signup and settings pages during profile update (#2031)
- Revert &quot;Revert &quot;Changed profile validation to not require a photo&quot;&quot;
- Refactored profile validation code
- Added grades app
- Revert &quot;Changed profile validation to not require a photo&quot;

Version 0.28.0 (Released December 07, 2016)
--------------

- Remove extra lines which were accidentally committed (#2023)
- Increase socket-timeout (#2010)
- Added redirect when visitors are using the herokuapp domain (#1998)
- Use HTML elements that are more semantic (#2003)
- Removed &#39;Clear all filters&#39; link when user switch pages of unfiltered search (#1989)
- fixes a layout issue on the FAQ tab

Version 0.27.1 (Released December 06, 2016)
--------------

- Removed First and Last Name from the edxorg pipeline

Version 0.27.0 (Released December 06, 2016)
--------------

- Changed profile validation to not require a photo
- Disabled photo button during upload (#1996)
- Add warning about legal name requirement (#1999)

Version 0.26.0 (Released December 06, 2016)
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

Version 0.25.3 (Released December 05, 2016)
--------------

-  Changed image uploader to not use png, it is too big  (#1972)

Version 0.25.2 (Released December 05, 2016)
--------------

- Use enrollment_url if provided for URL (#1963)

Version 0.25.1 (Released December 05, 2016)
--------------

- Updated address for sending financial aid documents (#1953)

Version 0.25.0 (Released December 02, 2016)
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

Version 0.24.0 (Released November 28, 2016)
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

Version 0.23.0 (Released November 22, 2016)
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

Version 0.22.0 (Released November 07, 2016)
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

Version 0.21.0 (Released November 04, 2016)
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

Version 0.20.0 (Released October 28, 2016)
--------------

- Upgraded redux-asserts again
- Add a __str__() for Role (#1594)
- Added management commands for fine-grained course state control
- Set background color of Zendesk button (#1496)
- Bumped redux-asserts version to 0.0.9
- Made detect_missing_migrations.sh use makemigrations --dry-run (#1587)
- Make modals more consistent (#1565)
- Hide the x-scroll on program page

Version 0.19.0 (Released October 28, 2016)
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

Version 0.18.0 (Released October 14, 2016)
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

Version 0.17.0 (Released October 13, 2016)
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

Version 0.16.0 (Released October 07, 2016)
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

Version 0.15.0 (Released October 05, 2016)
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

Version 0.14.0 (Released September 29, 2016)
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

Version 0.13.0 (Released August 04, 2016)
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

Version 0.12.0 (Released July 06, 2016)
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

Version 0.11.0 (Released June 22, 2016)
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

Version 0.10.0 (Released June 07, 2016)
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

Version 0.9.0 (Released June 06, 2016)
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

Version 0.8.0 (Released May 23, 2016)
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

Version 0.7.0 (Released May 04, 2016)
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

Version 0.6.0 (Released April 22, 2016)
-------------

- Fixed striptags requirement issue
- Certificates taken in account in dashboard
- Removed node-sass rebuild step
- Added fields to factory
- Added course progress indicator for dashboard
- Added country and city fields

Version 0.5.0 (Released April 22, 2016)
-------------

- Deleted the `employment` route placeholder
- Styled the homepage
- Added validation to personal page on profile
- Move arguments for boundSelectField for consistency

Version 0.4.0 (Released April 21, 2016)
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

Version 0.3.0 (Released April 13, 2016)
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

Version 0.2.0 (Released March 28, 2016)
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

Version 0.1.0 (Released March 11, 2016)
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

