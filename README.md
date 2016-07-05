# MicroMasters
Portal for learners and course teams to access MITx MicroMasters programs

## Major Dependencies
- Docker
  - OSX recommended install method: [Download from Docker website](https://docs.docker.com/mac/)
- docker-compose
  - Recommended install: pip (`pip install docker-compose`)
- Virtualbox (https://www.virtualbox.org/wiki/Downloads)
- _(OSX only)_ Node/NPM
  - OSX recommended install method: [Installer on Node website](https://nodejs.org/en/download/)
  - No specific version has been chosen yet.

## (OSX only) Getting your machine Docker-ready

#### Create your docker container:

The following commands create a Docker machine named ``mm``, start the
container, and configure environment variables to facilitate communication
with the edX instance.

    docker-machine create --driver virtualbox mm
    docker-machine start mm
    # 'docker-machine env (machine)' prints export commands for important environment variables
    eval "$(docker-machine env mm)"

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

Run Django admin (see "In Django admin" section from step 2), navigate to the
Django OAuth Toolkit section (/admin/oauth2_provider/), and add a
new Application. Fill in the values as follows:

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

The MicroMasters codebase contains a ``.env.sample`` file which will be used as
a template to create your ``.env`` file. For MicroMasters to work, it needs 3 values:

- ``EDXORG_BASE_URL``

    This value _should_ be ``http://192.168.33.10:8000``. The Vagrant VM IP is hard-coded
    in the Vagrantfile, and it's unlikely that edX will change that. The LMS server runs
    on port ``8000`` by default.
- ``EDXORG_CLIENT_ID`` and ``EDXORG_CLIENT_SECRET``

    These values can be found in the Django OAuth Toolkit Application you created above.
    **Client id:** and **Client secret:** values should be auto-generated for
    that new Application. Use those values for the corresponding ``EDXORG_``
    variables in the ``.env`` file.

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

This file should be copied from the sample in the codebase:

    cp .env.sample .env

Set the ``EDXORG_BASE_URL``, ``EDXORG_CLIENT_ID``, and ``EDXORG_CLIENT_SECRET``
variables in the ``.env`` file appropriately.

#### 2) _(OSX only)_ Set up and run the webpack dev server on your host machine

First, you'll need to add another variable into ``.env``:

    WEBPACK_DEV_SERVER_HOST='localhost'

In the development environment, our static assets are served from the webpack
dev server. When this environment variable is set, the script sources will
look for the webpack server at that host instead of the host where Docker is running.

Now, in a separate terminal tab, use the webpack helper script to install npm modules and run the dev server:

    ./webpack_dev_server.sh --install

The ``--install`` flag is only needed if you're starting up for the first time, or if updates have been made
to the packages in ``./package.json``. If you've installed those packages and there are no ``./package.json``
updates, you can run this without the ``--install`` flag: ``./webpack_dev_server.sh``

**DEBUGGING NOTE:** If you see an error related to node-sass when you run this script, try running
``npm rebuild node-sass``


#### 3) Run the container

For first-time container start-up, start it with a full build:

    docker-compose up --build

In another terminal tab, navigate the the MicroMasters directory
and add a superuser in the now-running Docker container:

    docker-compose run web python3 manage.py createsuperuser

Starting the container after this can be done without the ``--build``
param: ``docker-compose up``

You should now be able to do the following:

1. Visit MicroMasters in your browser on port `8079`. _(OSX Only)_ Docker auto-assigns
 the container IP. Run ``docker-machine ip`` to see it. Your MicroMasters URL will
 be something like this: ``192.168.99.100:8079``.
1. Click "Sign in with edX.org" and sign in by authorizing an edX client. If you're
 running edX locally, this will be the client you created in the steps above.

## Running Commands and Testing

As shown above, manage commands can be executed on the Docker-contained
MicroMasters app. For example, you can run a Python shell with the following command:

    docker-compose run web python3 manage.py shell

Tests should be run in the Docker container, not the host machine. They can be run with the following commands:

    # Run the full suite
    ./test_suite.sh
    # Run Python tests only
    docker-compose run web tox
    # Run the JS tests with coverage report
    docker-compose run watch npm run-script coverage
    # run the JS tests without coverage report
    docker-compose run watch npm test
    # run a single JS test file
    docker-compose run watch npm test /path/to/test.js
    # Run the JS linter
    docker-compose run watch npm run-script lint
    # Run JS type-checking
    docker-compose run watch npm run-script flow
