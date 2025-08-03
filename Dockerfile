FROM ghcr.io/osgeo/gdal:ubuntu-full-3.8.5

RUN apt-get update && \
    apt-get install -y pdal && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /work

COPY process.sh .
RUN chmod +x process.sh

ENTRYPOINT ["./process.sh"]