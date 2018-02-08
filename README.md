[![Build Status](https://travis-ci.org/mitodl/micromasters.svg?branch=master)](https://travis-ci.org/mitodl/micromasters) [![codecov](https://codecov.io/gh/mitodl/micromasters/branch/master/graph/badge.svg)](https://codecov.io/gh/mitodl/micromasters)

# MicroMasters
Portal for learners and course teams to access MITx MicroMasters programs

## Major Dependencies
- Docker
  - [Download from Docker website](https://docker.com/). Follow the OS X or Linux instructions depending on your OS.
- [Virtualbox](https://www.virtualbox.org/wiki/Downloads) to run edX locally
- _(OSX only)_ Node/NPM, and Yarn
  - OSX recommended install method: [Installer on Node website](https://nodejs.org/en/download/)
  - No specific version has been chosen yet.

## (OSX only) Getting your machine Docker-ready

#### Create your docker container:

The following commands create a Docker machine named ``default``, start the
container, and configure environment variables to facilitate communication
with the edX instance.

    docker-machine create
    docker-machine start
    # 'docker-machine env' prints export commands for important environment variables
    eval "$(docker-machine env)"

## Running edX devstack locally _(optional, but recommended)_

MicroMasters can work with a live instance of edX, but it's recommended that
you get it running locally. It's obviously more configurable that way, and you'll
likely need to run it locally for other projects in the future.

#### 1) Install edX

Download the edX Vagrant box according to
[these instructions provided by edX](https://edx-installing-configuring-and-running.readthedocs.io/en/latest/installation/devstack/install_devstack.html#installing-devstack-with-a-direct-vagrant-box-download)

#### 2) Connect to the VM and run the LMS server

edX has [instructions for this as well](https://edx-installing-configuring-and-running.readthedocs.io/en/latest/installation/devstack/start_devstack.html#connect-to-devstack-vm).
More concisely, these are the commands you should run to connect to the VM and run the LMS server:

    # In your local edx_devstack/ directory, start the VM
    vagrant up
    # Once that's done, ssh into the running VM
    vagrant ssh
    # Switch to the edxapp account within SSH session
    sudo su edxapp
    # Run the LMS server
    paver devstack lms
    # To run the server without updating requirements and compiling assets, add the '--fast' parameter
    # eg: paver devstack --fast lms

A few notes:

- Switching to the edxapp account sources the edxapp environment and sets the
 current working directory to the edx-platform repository.
- "LMS" stands for "Learning Management System". The Open edX platform has
 [several different components](http://edx.readthedocs.io/projects/edx-developer-guide/en/latest/architecture.html#overview);
 MicroMaster's only depends on LMS.


#### 3) Set up a user with superuser permissions

Once in the VM, creating a superuser/setting superuser permissions can be done
in Django admin or in a shell. It's preferable to do it in Django admin as you'll
need to use Django admin for the next step anyway.

- **In Django admin**

    Run the server (discussed in step 2) and navigate to Django admin
    (eg: http://192.168.33.10:8000/admin). In the **Authentication and Authorization**
    section, select a **User**, or add one then select it. In the **Permissions**
    section, check the **Superuser status** box and save.

- **In a Python shell**

        # Kick off an interactive shell
        python manage.py lms --settings=devstack shell

        ### RUN THESE WITHIN THE SHELL ###
        from django.contrib.auth.models import User
        # We'll update the dummy user 'staff' to have superuser permissions
        user = User.objects.get(username='staff')
        user.is_superuser=True
        user.save()

#### 4) Add an OAuth client

Run Django admin (see "In Django admin" section from step 2),
login as the "staff" user (email is "staff@example.com", password is "edx"),
navigate to the Django OAuth Toolkit section (/admin/oauth2_provider/),
and add a new Application. Fill in the values as follows:

- **User**: Use the lookup (magnifying glass) to find your superuser
- **Redirect uris**: The URL where MicroMaster’s will be running, followed by "/complete/edxorg/".
 **Linux users:** the MicroMaster’s URL will be `http://localhost:8079`. **OSX users:** The MicroMaster's
 IP can be found by running ``docker-machine ip <machine_name>`` from the host machine. MicroMaster’s runs on port
 ``8079`` by default, so the full URL should be something like
 ``http://192.168.99.100:8079/complete/edxorg/``
- **Client type**: Set to '_Confidential_'.
- **Authorization grant type**: Set to '_Authorization Code_'.
- **Name**: Anything you want. Something like 'mm-local' would do fine here.

#### 5) Copy relevant values to use in the MicroMasters .env file

The MicroMasters codebase contains a ``.env.example`` file which will be used as
a template to create your ``.env`` file. For MicroMasters to work, it needs 4 values:

- ``EDXORG_BASE_URL``

    This value _should_ be ``http://192.168.33.10:8000``. The Vagrant VM IP is hard-coded
    in the Vagrantfile, and it's unlikely that edX will change that. The LMS server runs
    on port ``8000`` by default.
- ``EDXORG_CLIENT_ID`` and ``EDXORG_CLIENT_SECRET``

    These values can be found in the Django OAuth Toolkit Application you created above.
    **Client id:** and **Client secret:** values should be auto-generated for
    that new Application. Use those values for the corresponding ``EDXORG_``
    variables in the ``.env`` file.
- ``GOOGLE_API_KEY``

    You should get your own API key from Google and use it here. [Learn how to
    get an API key from Google.](https://github.com/mitodl/micromasters/blob/master/docs/google-api-key.md)

#### General edX devstack debugging notes

- To update your devstack with important changes from edX, run `vagrant provision` in
your edx_devstack directory. This will pull down the latest release and run migrations, among
other things.
- If you get an error related to Mongo locking while ssh'ed into the Vagrant VM, run the following
 **as the default 'vagrant' user, NOT as the 'edxapp' user**:

       function mongo_unlock {
           sudo rm /edx/var/mongo/mongodb/mongod.lock
           sudo mongod -repair --config /etc/mongod.conf
           sudo chown -R mongodb:mongodb /edx/var/mongo/.
           sudo /etc/init.d/mongod start
       }
       mongo_unlock
- If you get the error  _"Unknown task: devstack, the working directory has not been updated
properly"_, simply run ``cd /edx/app/edxapp/edx-platform`` and re-run the command.

## Docker Container Configuration and Start-up

#### 1) Create your ``.env`` file

This file should be copied from the example in the codebase:

    cp .env.example .env

Set the ``EDXORG_BASE_URL``, ``EDXORG_CLIENT_ID``, and ``EDXORG_CLIENT_SECRET``
variables in the ``.env`` file appropriately.

#### 2) _(OSX only)_ Set up and run the webpack dev server on your host machine

In the development environment, our static assets are served from the webpack
dev server. This is run in the `watch` container on Linux but at the moment
file notifications don't work across the shared folders used in docker-machine. So for
OSX we need to run this in the host environment.

You'll need to install the [yarn](https://yarnpkg.com/en/docs/cli/)
package manager. You can do:

    sudo node ./scripts/install_yarn.js

To install it. Nice! You can check which version is installed in
`package.json` to be make you're getting the version we are
standardized on.

Now, in a separate terminal tab, use the webpack helper script to install npm modules and run the dev server:

    ./webpack_dev_server.sh --install

The ``--install`` flag is only needed if you're starting up for the first time, or if updates have been made
to the packages in ``./package.json``. If you've installed those packages and there are no ``./package.json``
updates, you can run this without the ``--install`` flag: ``./webpack_dev_server.sh``

**DEBUGGING NOTE:** If you see an error related to node-sass when you run this script, try deleting `node_modules` and running
``yarn install`` again.

#### 3) Build the containers
Run this command:

    docker-compose build

You will also need to run this command whenever ``requirements.txt`` or ``test_requirements.txt`` change.

#### 4) Create data structures
First, create the database tables from the Django models:

    docker-compose run web ./manage.py migrate

Then, initialize the Elasticsearch indexes and mappings for this data:

    docker-compose run web ./manage.py recreate_index

This command should only need to be run when the Elasticsearch container
is first created. It may also be run afterwards to clear and recreate
existing indexes, and to reindex relevant documents.

#### 5) Seed initial data (for development only)
These steps should *not* be run in production; they are only to assist in
development. The `seed_db` management command will seed example data into
most of the database tables:

    docker-compose run web ./manage.py seed_db

#### 6) Run the container

Start Django, PostgreSQL, and other related services:

    docker-compose up

In another terminal tab, navigate to the MicroMasters directory
and add a superuser in the now-running Docker container:

    docker-compose run web ./manage.py createsuperuser

You should now be able to do the following:

1. Visit MicroMasters in your browser on port `8079`.

  * OSX: Docker auto-assigns
 the container IP. Run ``docker-machine ip`` to see it. Your MicroMasters URL will
 be something like this: ``192.168.99.100:8079``.
  * Linux: You should be able to access this port at localhost: ``localhost:8079``.

2. Click "Sign in with edX.org" and sign in by authorizing an edX client. If you're
 running edX locally, this will be the client you created in the steps above.

## Wagtail CMS (Content Management System)

The CMS can be found at `/cms/`. Use the CMS to manage the content of the program pages and home 
page.  

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

## Running Commands

As shown above, management commands can be executed on the Docker-contained
MicroMasters app. For example, you can run a Python shell with the following command:

    docker-compose run web ./manage.py shell

## Testing

Tests should be run in the Docker container, not the host machine. They can be run with the following commands:

    # Run the full suite
    ./test_suite.sh
    # Run Python tests only
    docker-compose run web tox
    # Single file test
    docker-compose run web tox /path/to/test.py
    # Run the JS tests with coverage report
    docker-compose run watch npm run-script coverage
    # run the JS tests without coverage report
    docker-compose run watch npm test
    # run a single JS test file
    docker-compose run watch npm test /path/to/test.js
    # Run the JS linter
    docker-compose run watch npm run lint
    # Run JS type-checking
    docker-compose run watch npm run flow
    # Run SCSS linter
    docker-compose run watch npm run scss_lint
    # RUN prettier-eslint, fixes style issues
    docker-compose run watch npm run fmt

Note that running [`flow`](https://flowtype.org) may not work properly if your
host machine isn't running Linux. If you are using a Mac, you'll need to run
`flow` on your host machine, like this:

    yarn install --frozen-lockfile
    npm run-script flow

To validate prices and financial aid discounts for all programs run:

    docker-compose run web ./manage.py validate_db

#### Selenium

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

##### Generating screenshots

To generate screenshots of various dashboard states, run this command:

    ./scripts/test/run_snapshot_dashboard_states.sh

##### Viewing tests via browser

Selenium tests run locally will forward port 7000 to the inner container. To
view the test server with your browser, go to [http://your_mm_ip_address:7000](http://your_mm_ip_address:7000).

## Connecting to external services

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
