Install Open edX
---


#### Setup Open edX Devstack

Following steps are inspired by [edx-devstack](https://github.com/edx/devstack).

#### Creating directories and virtual environment

```
mkdir edx
cd edx

# For ironwood
virtualenv -p python2 venv

# For juniper or later
virtualenv -p python3 venv

source venv/bin/activate
```

#### Exporting OPENEDX_RELEASE variable

You have to export OPENEDX_RELEASE version every time you open a new terminal for open edX's docker management.

Note: In-case you want to use `master` branch, do not set/export this variable.

```
export OPENEDX_RELEASE=<RELEASE-BRANCH i.e: "ironwood.master">
```

or you can simple export it in your .bashrc (for linux) or .bash_profile (for mac)

```
echo 'export OPENEDX_RELEASE=ironwood.master' >> ( `~/.bashrc` or `~/.bash_profile` )
source ( `~/.bashrc` or `~/.bash_profile` )
```

#### Clone edx/devstack

```
# Clone edx devstack
git clone https://github.com/edx/devstack

cd devstack

# Checkout specific release branch (in-case you don't want master branch)
git checkout <RELEASE-BRANCH i.e: "open-release/ironwood.master">

# Install requirements
make requirements

# Clone all open edX releated repos
make dev.clone

cd ..
```

#### Using mitodl's edx-platform

We can use mitodl's edx-platform by setting remote in pre-cloned edx-platform's repo or by recloning the repo.

```
# By recloning
rm -r edx-platform
git clone https://github.com/mitodl/edx-platform

# OR

# Via setting mitodl's remote
cd edx-platform
git remote set-url origin https://github.com/mitodl/edx-platform
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
git fetch origin
git reset --hard <BRANCH-NAME i.e: "open-release/ironwood.master" or "master">
cd ..
```

#### Pull latest images and run provision

```
$ cd devstack
$ make pull
$ make dev.provision
$ cd ..
```

Note: `make dev.provision` command will automatically checkout/change all repo branches depending upon `OPENEDX_RELEASE` exported variable (if OPENEDX_RELEASE is not set, it will use master branches). So if you have any requiements related changes in your branch then you have to install requirements in the shell of that specific container, manually (manuall intallation process is described below).

#### Changing edx-platform's branch to mitodl's master

```
$ cd edx-platform
$ git checkout master
```

#### Start and Stop your servers by running following in devstack repo

```
$ make dev.up
$ make stop
```

#### Manually installing requirements in LMS and CMS

```
$ cd devstack

# For lms
$ make lms-shell
$ make requiements

# For cms
$ make cms-shell
$ make requiements
```

#### Configure Micromasters to support OAuth2 authentication from Open edX

  - In Open edX:
    - Add a new domain (if not already exists) in your `/etc/hosts` file (e.g: `127.0.0.1    edx.odl.local`)
    - Create and configure site through admin panel `/admin` (_OPTIONAL_)
      - Go to `/admin/sites/site/` and create a site with `domain-name = edx.odl.local:18000`.
      - Add theme through `/admin/theming/sitetheme/`.
    - Go to `/admin/oauth2_provider/application/` and verify that an application named `micromasters` (name does not really matter here) exists with these settings:
      - `Redirect uris`: `http://mm.odl.local:8079/complete/edxorg/`
      - `Client type`: "Confidential"
      - `Authorization grant type`: "Authorization code"
      - `Skip authorization`: checked
      - Other values are arbitrary but be sure to fill them all out. Save the client id and secret for later
  - In Micromasters:
    - Set `EDXORG_BASE_URL` to the correct URL that is accessible from Micromasters container and host, e.g. `http://edx.odl.local:18000/`
      - If Micromasters isn't able to access the Open edX hostname directly (primarily due to the way networking is handled in compose projects) you will need to set `OPENEDX_HOST_ENTRY` in `.env` file such that Mircomasters is able to resolve the Open edX hostname from within the container. Typically this would mean setting the value similar to `edx.odl.local:172.22.0.1` where the IP is the gateway IP on the Micromasters docker network.
    - Set `OPENEDX_API_CLIENT_ID` to the client id
    - Set `OPENEDX_API_CLIENT_SECRET` to the client secret
