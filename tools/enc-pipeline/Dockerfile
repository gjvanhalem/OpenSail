# GDAL (S-57 reader, ogr2ogr) plus tippecanoe (vector tiles straight to PMTiles)
FROM ghcr.io/osgeo/gdal:ubuntu-small-3.10.3

ARG TIPPECANOE_VERSION=2.79.0

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential git ca-certificates curl unzip jq \
      libsqlite3-dev zlib1g-dev \
 && git clone --depth 1 --branch "${TIPPECANOE_VERSION}" https://github.com/felt/tippecanoe.git /tmp/tippecanoe \
 && make -C /tmp/tippecanoe -j"$(nproc)" \
 && make -C /tmp/tippecanoe install \
 && rm -rf /tmp/tippecanoe \
 && apt-get purge -y build-essential git \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /work
COPY build-region.sh /usr/local/bin/build-region
# A Windows checkout may give the script CRLF line endings
RUN sed -i 's/\r$//' /usr/local/bin/build-region && chmod +x /usr/local/bin/build-region
ENTRYPOINT ["build-region"]
