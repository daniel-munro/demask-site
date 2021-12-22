# DeMaSk Web Server

This is the code for [demask.princeton.edu](https://demask.princeton.edu), a website that runs DeMaSk for user-submitted protein sequences and provides visualizations and downloads of the results.

It accepts a protein sequence. The backend is managed by a (Flask)[https://flask.palletsprojects.com/en/2.0.x/] server, which receives a protein sequence and runs DeMaSk. It stores information on each job in a SQLite table. When DeMaSk is finished, it returns results, which the frontend visualizes using [D3.js](https://d3js.org/). Jobs are indexed by a hash of the protein sequence and the results are cached. So if the same protein is submitted again, the results are returned instantly and DeMaSk will not be re-run.

## Requirements

Python3 packages:

- Flask
- Flask-Cors
- Flask-RESTful
- Flask-SQLAlchemy
- DeMaSk, installed from local source, e.g. `pip3 install -e DeMaSk/`

## Updates

To update the web server:

1. `ssh` into the web server.
2. Pull updates, if any, from this repository.
3. Pull updates, if any, from the [DeMaSk package repository](https://github.com/Singh-Lab/DeMaSk).
4. Delete old data if instructed to.
5. /Genomics/demask/local/bin/circusctl restart demask
6. service nginx restart
