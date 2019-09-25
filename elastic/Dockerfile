FROM elasticsearch:5.6.6

# Lower elasticsearch memory usage limit
RUN sed -i 's/-Xms2g/-Xms512m/' /etc/elasticsearch/jvm.options
RUN sed -i 's/-Xmx2g/-Xmx512m/' /etc/elasticsearch/jvm.options
