FROM mitodl/micromasters_web_travis_ba4c35

WORKDIR /tmp

USER root

COPY requirements.txt /tmp/requirements.txt
COPY test_requirements.txt /tmp/test_requirements.txt
RUN pip install -r requirements.txt && pip install -r test_requirements.txt
RUN rm -rf /tmp/.cache

# mm_web_travis comes with a copy of the source which may not match the current copy, so we need to copy it again
RUN rm -rf /src
RUN mkdir /src

WORKDIR /src

COPY . /src

RUN chown -R mitodl:mitodl /src

USER mitodl
