[![Build Status](https://travis-ci.org/mitodl/micromasters.svg?branch=master)](https://travis-ci.org/mitodl/micromasters) [![codecov](https://codecov.io/gh/mitodl/micromasters/branch/master/graph/badge.svg)](https://codecov.io/gh/mitodl/micromasters)

# MicroMasters
Portal for learners and course teams to access MITx MicroMasters programs.

# Initial setup

MicroMasters mostly follows the same [initial setup steps outlined in the common ODL web app guide](https://github.com/mitodl/handbook/blob/master/common-web-app-guide.md).
Run through those steps in order with the following changes:

1. After [creating the database models](https://github.com/mitodl/handbook/blob/master/common-web-app-guide.md#3-create-database-tables-from-the-django-models), you should create the Elasticsearch indices via management command:

   ```
   docker-compose run web ./manage.py recreate_index
   ```

1. **Do not run the `createsuperuser` command.** When you log into this app via edX, a MicroMasters
Django user is created for you automatically. See the section below for instructions on how to run edX locally.


### Running edX devstack locally _(optional, but recommended)_

MicroMasters can work with a deployed instance of edX, but it's recommended that
you get it running locally. It's obviously more configurable that way, and you'll
likely need to run it locally for other projects in the future.

#### 1) Install edX
Install edX following this guide https://github.com/mitodl/micromasters/blob/master/docs/configure_open_edx.md


#### 2) Copy relevant values to use in the MicroMasters .env file

The MicroMasters codebase contains a ``.env.example`` file which will be used as
a template to create your ``.env`` file. For MicroMasters to work, it needs 4 values:

- ``EDXORG_BASE_URL``

    The base URL where the LMS server is running on your machine. This
    _should_ typically be ``http://edx.odl.local:18000``.

- ``EDXORG_CLIENT_ID`` and ``EDXORG_CLIENT_SECRET``

    These values can be found in the Django OAuth Toolkit Application you created [above](https://github.com/mitodl/micromasters/blob/master/docs/configure_open_edx.md).
    **Client id:** and **Client secret:** values should be auto-generated for
    that new Application. Use those values for the corresponding ``EDXORG_``
    variables in the ``.env`` file.

# Additional setup

### Configure `.env` settings

The following settings should be configured before running the app:

- `EDXORG_BASE_URL`, `EDXORG_CLIENT_ID` and `EDXORG_CLIENT_SECRET`

    If you're running edX locally as detailed in the steps above, you've already done this. If you're running
    against a deployed edX instance, `EDXORG_BASE_URL` should be the base URL of that instance, and you'll need to get
    the client id/secret values from devops.

- `GOOGLE_API_KEY`

    You should get your own API key from Google and use it here. [Learn how to
    get an API key from Google.](https://github.com/mitodl/micromasters/blob/master/docs/google-api-key.md)


# Running and Accessing the App

MicroMasters follows the same steps outlined in the [common ODL web app guide for running and accessing the app](https://github.com/mitodl/handbook/blob/master/common-web-app-guide.md#running-and-accessing-the-app).

After completing those steps, you should be able to do the following:

1. Visit MicroMasters in your browser on port `8079`.
2. Click "Sign in with edX.org" and sign in by authorizing an edX client. If you're
 running edX locally and you're not already logged in, use the same user that you configured above.

### Configuration after first login

**It's highly recommended that you do the following immediately after your first login with an edX user.**
After logging into MicroMasters via edX with a given user for the first time, a new MicroMasters user is created to mirror that edX user.
These commands will help you to fully explore the MicroMasters UI:

1. **Set your user as a superuser.**

    Open django shell
    ```
    docker-compose run web bash
    pyton manage.py shell
    ```

    Run below script in shell
    ```python
    from django.contrib.auth.models import User
    # Replace 'staff' with the username of the edX user you logged in with
    user = User.objects.get(username='staff')
    user.is_superuser = True
    user.is_staff = True
    user.save()
    ```

2. **Seed the database with example programs, courses, users, etc.**

   This will create programs and courses, and a set of users with enrollments and grades in those courses. This helps to flesh out
   both the learner and instructor UX for the app.

   ```bash
   # Run from a shell in your host machine
   # Replace 'staff' with the username of the edX user you logged in with
   docker-compose run web ./manage.py seed_db --staff-user='staff'
   ```

After completing those two steps, reload MicroMasters in the browser and complete the profile for your user. You should be able to select a program for enrollment, and after completing the forms you should be able to access both the instructor and learner views (`/learners` and `/dashboard` respectively).

### Wagtail CMS (Content Management System)

The CMS can be found at `/cms/`. Use the CMS to manage the content of the program pages and home page.

#### Adding a new MicroMasters program

1. Login to the CMS with an admin account. If you don't have one, you can use the superuser account created earlier.

2. Click on the `Explorer` menu in the left nav to find the home page (labelled "MIT credentials are...")

3. Click on `+ Add Child Page`

4. Choose Program Page. Complete the form. Don't forget to publish your changes.

#### Adding CMS users

1. Don't create new users from the CMS. Ask users to log in and fill out a MicroMasters profile first.

2. Login to the CMS with an existing account. If you don't have one, you can use the superuser account created earlier.

3. From the Settings menu in the left nav, choose users.

4. You can use the search box to locate users who already exist. If the user already exists, click on the username and
skip to step 5.

5. Click on the Roles tab.

6. Check the box for the editors group. This will allow the user to view and edit all pages in the CMS.

# Testing

See the ['Testing' section of the common web app guide](https://github.com/mitodl/handbook/blob/master/common-web-app-guide.md#testing) for most of the commands for running tests, linting, etc.

There are also some MicroMasters-specific testing tools:

    # [Linux] Run JS type-checking
    docker-compose run watch npm run flow
    # [OSX] Run JS type-checking
    npm run-script flow

Note that running [`flow`](https://flowtype.org) may not work properly if your
host machine isn't running Linux. If you are using a Mac, you'll need to run
`flow` on your host machine, like this:

    yarn install --frozen-lockfile
    npm run-script flow

### Selenium

To run selenium tests make sure you have the application running, including the web
server and webpack dev server. Then run this script to run the selenium tests:

    ./scripts/test/run_selenium_tests_dev.sh

This script sets up certain environment variables and runs
all tests in the `selenium_tests/` directory, which are assumed
to all require selenium.

**Note**: If you are having trouble with database state
(this works differently from the rest of the tests), remove the
`--reuse-db` flag from `pytest.ini` and try again.

If a test errors but selenium is still working, it will take
a screenshot of the browser at the point of the error and write it
as a png file in the project directory.

##### Viewing running tests in the browser

Selenium tests run locally will forward port 7000 to the inner container. To
view the test server with your browser, go to `http://<your_mm_ip_address>:7000`.


# Running Commands

#### Setting user state

You'll often need a user to be in a certain state with respect to some course/course run (e.g.: your user needs to have
a passing grade in some course). There is a management command that can be used to easily accomplish this kind of change
of state.

	# See usage details
    docker-compose run web ./manage.py alter_data --help
    # See example commands
    docker-compose run web ./manage.py alter_data examples

#### Generating screenshots

There is a helper script that uses Selenium to create screenshots of various learner dashboard states.
To generate these screenshots, run this command:

    ./scripts/test/run_snapshot_dashboard_states.sh

Screenshots are saved to the `output` directory.

#### Validating financial aid info

To validate prices and financial aid discounts for all programs run:

    docker-compose run web ./manage.py validate_db


# Connecting to external services

#### Elasticsearch

If you want to connect to an ES cluster aside from the one created by Docker, you'll need to do the following:

1. Add these variables to your `.env` file (without parentheses):

        ELASTICSEARCH_INDEX=(your_index_name)
        ELASTICSEARCH_URL=https://(your_elastic_search_url)
        ELASTICSEARCH_HTTP_AUTH=(your_cluster_name):(key)

2. If any of the above variables are set in the `web` configuration in `docker-compose.yml`, those
 will override the values you have in `.env`. Delete them.
3. Restart the `db` and `elastic` docker-compose services if they're running:
 `docker-compose restart db elastic`

You should now be able to connect to the external ES cluster. You
can run `docker-compose run web ./manage.py recreate_index` to test
that it's working.


# Electives
#### Set up elective courses for a program
In django admin:
1. Create an `ElectivesSet`, specify `Required number` which is a number of courses that a learner has to pick
out of the courses in this set. (Multiple elective sets could be created for the same program)
2. Create an `ElectiveCourse` object for each course that is going to be an elective.
3. Update the `Program` object by setting the total number of courses required to
pass the program: `Num required courses`.


## Session persistence issue
If you experience intermittent logouts while browsing the application and a general ephemeral behaviour from user sessions, switch the Django session backend by adding the following in your environment file:
`SESSION_ENGINE=django.contrib.sessions.backends.file`
