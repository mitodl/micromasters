FROM python:3.6
LABEL maintainer "ODL DevOps <mitx-devops@mit.edu>"


# Add package files, install updated node and pip
WORKDIR /tmp

# Install packages and add repo needed for postgres 9.6
COPY apt.txt /tmp/apt.txt
RUN echo deb http://apt.postgresql.org/pub/repos/apt/ jessie-pgdg main > /etc/apt/sources.list.d/pgdg.list
RUN curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
RUN apt-get update
RUN apt-get install -y $(grep -vE "^\s*#" apt.txt  | tr "\n" " ")

# Add repo needed for postgres 9.6 and install it
RUN apt-get update && apt-get install libpq-dev postgresql-client-9.6 -y

# pip
RUN curl --silent --location https://bootstrap.pypa.io/get-pip.py | python3 -

# Add, and run as, non-root user.
RUN mkdir /src
RUN adduser --disabled-password --gecos "" mitodl
RUN mkdir /var/media && chown -R mitodl:mitodl /var/media

# Install project packages
COPY requirements.txt /tmp/requirements.txt
COPY test_requirements.txt /tmp/test_requirements.txt
RUN pip install -r requirements.txt -r test_requirements.txt

# Add project
COPY . /src
WORKDIR /src
RUN chown -R mitodl:mitodl /src

# Gather static
RUN ./manage.py collectstatic --noinput
RUN apt-get clean && apt-get purge
USER mitodl

# Set pip cache folder, as it is breaking pip when it is on a shared volume
ENV XDG_CACHE_HOME /tmp/.cache

EXPOSE 8079
ENV PORT 8079
CMD uwsgi uwsgi.ini
