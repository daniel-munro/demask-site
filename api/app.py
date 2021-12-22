"""Flask server to receive protein sequences, track DeMaSk jobs, and cache and return results"""

from flask import Flask, request, send_from_directory
from flask_restful import Resource, Api, reqparse, inputs
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
# from flask_migrate import Migrate
import hashlib
import subprocess


def process_fasta(fasta):
    """Accept fasta or plain sequence and return fasta, sequence hash, and sequence"""
    lines = fasta.splitlines()
    lines = [line for line in lines if line != '']
    if lines[0][0] == '>':
        lines = lines[1:]
    if any([line[0] == '>' for line in lines]):
        raise ValueError("Submit only one sequence at a time.")
    # name = lines[0][1:].split()[0] # Use for something?
    seq = ''.join(lines)
    sha1 = hashlib.sha1(seq.encode()).hexdigest()[:20]
    lines.insert(0, '>' + sha1)
    fasta = '\n'.join(lines) + '\n'
    return fasta, sha1, seq


DATADIR = '/Genomics/demask/data'
# DATADIR = '../../data'
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DATADIR}/demask.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
# migrate = Migrate(app, db)
CORS(app, origin='localhost') # API requests are forwarded to port 5000, which Flask listens to
api = Api(app, prefix='/api')
version = 3       # Increment when DeMaSk update would change results.


class Scoreset(db.Model):
    """Metadata for each submitted protein sequence"""
    sha1 = db.Column(db.String(20), primary_key=True)
    version = db.Column(db.Integer, nullable=False)
    submitted_at = db.Column(db.DateTime, default=db.func.now(),
                             nullable=False)
    finished_at = db.Column(db.DateTime)
    homologs = db.Column(db.Boolean, default=False, nullable=False)
    n_homologs = db.Column(db.Integer)
    ready = db.Column(db.Boolean, default=False, nullable=False)
    error = db.Column(db.Boolean, default=False, nullable=False)

    def __repr__(self):
        return '<Scoreset {} v={} s={} f={} h={} r={} e={}>'.format(
            self.sha1, self.version, self.submitted_at,
            self.finished_at, self.homologs, self.ready, self.error
        )


class JobCollectionResource(Resource):
    """Run a new job for a submitted protein sequence"""
    def post(self):
        fasta = request.form.get('seq').upper()
        fasta, ID, seq = process_fasta(fasta)
        scoreset = Scoreset.query.filter_by(sha1=ID).first()
        if not scoreset or scoreset.error:
            if scoreset and scoreset.error:
                db.session.delete(scoreset)  # Try running it again.
                db.session.commit()
            scoreset = Scoreset(sha1=ID, version=version)
            db.session.add(scoreset)
            db.session.commit()
            open(f'{DATADIR}/working/{ID}.fa', 'w').write(fasta)
            out = open(f'{DATADIR}/status/{ID}.txt', 'w')
            subprocess.Popen(['bash', 'run_job.sh', ID], stdout=out, stderr=out)
        resp = {}
        resp['id'] = scoreset.sha1
        resp['ready'] = scoreset.ready
        return resp


class JobResource(Resource):
    """Get the status of a submitted job"""
    def get(self, ID):
        scoreset = Scoreset.query.filter_by(sha1=ID).first()
        assert scoreset is not None
        resp = {}
        resp['ready'] = scoreset.ready
        if scoreset.error:
            message = open(f'{DATADIR}/status/{ID}.txt', 'r').read()
            resp['status'] = 'Error:\n' + message
        elif scoreset.ready:
            resp['status'] = 'Finished. Redirecting to results...'
            resp['n_homologs'] = scoreset.n_homologs
        elif scoreset.homologs:
            resp['status'] = 'Computing scores...'
        else:
            resp['status'] = 'Searching for homologs (this should take 7-10 minutes)...'
        return resp


class ScoresetResource(Resource):
    """Return prediction scores for a protein"""
    def get(self, ID):
        parser = reqparse.RequestParser()
        parser.add_argument('download', type=inputs.boolean, default=False,
                            help='Include to send as downloadable attachment.')
        args = parser.parse_args()
        return send_from_directory(f'{DATADIR}/results', f'{ID}.txt', as_attachment=args['download'])


class AlignmentResource(Resource):
    """Return the aligned homologs for a protein"""
    def get(self, ID):
        parser = reqparse.RequestParser()
        parser.add_argument('download', type=inputs.boolean, default=False,
                            help='Include to send as downloadable attachment.')
        args = parser.parse_args()
        return send_from_directory(f'{DATADIR}/working', f'{ID}.a2m', as_attachment=args['download'])


class PosRankResource(Resource):
    """Return the summary table of ranked protein positions"""
    def get(self, ID):
        parser = reqparse.RequestParser()
        parser.add_argument('download', type=inputs.boolean, default=False,
                            help='Include to send as downloadable attachment.')
        args = parser.parse_args()
        return send_from_directory(f'{DATADIR}/pos_rank', f'{ID}.pos_rank.txt', as_attachment=args['download'])


api.add_resource(JobCollectionResource, '/jobs')
api.add_resource(JobResource, '/jobs/<ID>')
api.add_resource(ScoresetResource, '/scoresets/<ID>')
api.add_resource(AlignmentResource, '/alignments/<ID>')
api.add_resource(PosRankResource, '/pos_rank/<ID>')


@app.cli.command()
def create_db():
    """Create a new database file."""
    db.create_all()
    # print('Now call "flask db init" to initiate migrations.')

# To migrate: flask db migrate, then if it looks OK, flask db upgrade.

@app.cli.command()
def list_scoresets():
    """List IDs of all stored scoresets."""
    for scoreset in db.session.query(Scoreset):
        print(scoreset)

@app.cli.command()
def empty_db():
    """Delete all entries from database (but keep files)."""
    db.session.query(Scoreset).delete()
    db.session.commit()


if __name__ == '__main__':
    app.run(debug=True)
