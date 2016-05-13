# Micromasters
Portal for learners and course teams to access MITx Micromasters programs

## Getting Started

Although you can run Micromasters locally with a default sqlite database after
installing the ``requirements.txt`` file, the recommended way is to 
use [Docker](https://www.docker.io).


### (OSX only) Create your docker machine:

If you are using OS X you will need to run Docker inside of a VM. Install docker-machine then run:

    docker-machine create mm
    docker-machine start mm
    docker-machine env mm
    eval "$(docker-machine env mm)"

These commands create a Docker container named ``mm``, start the
container, and configure environment variables to facilitate communication
with the ``edX`` instance.

### Start Docker
Install Docker, then install ``docker-compose`` and run the app: 

    pip install docker-compose 
    docker-compose up

This will set up a near production-ready containerized development 
environment that runs migrations, with the Django development server 
running on port ``8079``.

To run one-off commands, like shell, you can run:

    docker-compose run web python manage.py shell

or to create root user:

    docker-compose run web python manage.py createsuperuser


## OS X setup

Due to file notification issues using Docker in OSX, the webpack watcher requires a program
to sync file changes. Install [docker-osx-dev](https://github.com/brikis98/docker-osx-dev) which
runs rsync to sync the file changes. If you have [``homebrew``](http://brew.sh/) installed, you can 
install ``docker-osx-dev`` by typing ``make`` in the root of the Micromasters
project directory. The make file will install or update Docker using Homebrew
and go on to install ``docker-osx-dev``.

Subsequently, before you run the application with ``docker-compose up``, 
you would run:
  
    docker-osx-dev -m mm -s ./ --ignore-file '.rsync-ignore'

(Assuming your Docker VM is called ``mm``, and your current working
directory is the root of the ``micromasters`` source directory).

This starts a process that monitors the file system for changes. On startup
you may receive this error:
  
      [ERROR] Found VirtualBox shared folders on your Boot2Docker VM. 
      These may void any performance benefits from using docker-osx-dev:
      
      /Users
      
      [INSTRUCTIONS] Would you like this script to remove them?
      1) yes
      2) no

Answer ``yes``.

## Configuration and Start-up

Create a user who has permission to view the course:

    docker-compose run web python manage.py createsuperuser

Start the machine:

    docker-compose up

(OSX only) visit: http://192.168.99.100:8079/

Note: Your IP address may vary depending on what address Docker 
assigns to your container.  If the IP address above doesn't work, enter 
this command:

    docker-machine ls

The command lists the containers and their URLs.  Your container's URL
will be something like ``tcp://192.168.99.100:2376``.  Micromasters will 
run at that URL, but on port ``8079``.  So, for this example, Micromasters 
will run at ``192.168.99.100:8079``.

## Configuring edX devstack

These instruction presume that you're running Micromasters in a development 
environment that includes a local edX devstack.  If you don't have a edX
devstack installed navigate to these
[instructions](https://openedx.atlassian.net/wiki/display/OpenOPS/Running+Devstack)
that walk you through the installation.  We'll wait.

### Create a superuser 
   
You need a user with superuser privileges to create the edX client for 
Micromasters.  Start up the edX devstack and ssh into the ``edxapp`` user.

    vagrant up
    vagrant ssh
    sudo su edxapp

    edxapp@precise64:~/edx-platform$ pip install ipython

Open an iPython shell and execute these commands:

      edxapp@precise64:~/edx-platform$ python manage.py lms --settings=devstack shell
      Python 2.7.10 (default, Jun 29 2015, 22:38:23)
      Type "copyright", "credits" or "license" for more information.

      IPython 4.1.2 -- An enhanced Interactive Python.
      ?         -> Introduction and overview of IPython's features.
      %quickref -> Quick reference.
      help      -> Python's own help system.
      object?   -> Details about 'object', use 'object??' for extra details.

      In [1]: from django.contrib.auth.models import User

      In [2]: User.objects.get(username='staff')
      Out[2]: <User: staff>

      In [3]: staff=_

      In [4]: staff.is_superuser=True

      In [5]: staff.save()

      In [6]:
      Do you really want to exit ([y]/n)? y

Start the LMS:

    paver devstack lms

Navigate to ``localhost:8000/admin`` and login with the superuser account.
Scroll down to the "Oauth2" section and open "Clients".
Create a new client
    name - your choice of name, mine is ``micromasters-local``.
    Url - the URL of your local Micromasters instance, a URL on port ``8087``.
    Redirect url: the same URL, but with ``/complete/edxorg/`` at the end. 
    Client type: Chose "Confidential (Web applications)"

Make a note of the Client id and the Client secret; you need them to
configure Micromasters.  Don't forget to save your new client.

Return to Micromasters and, the project root directory, copy the 
``.env.sample`` file to ``.env`` and edit these values:
    
    STATUS_TOKEN: Can be anything. STATUS_TOKEN is not used in local development.
    EDXORG_BASE_URL: The URL of your local edX instance. Something like: ``http://192.168.33.10:8000``
    EDXORG_CLIENT_ID: The ``Client id`` from the edX Oauth2 client.
    EDXORG_CLIENT_SECRET: The ``Client secret`` from the edX Oauth2 client.



