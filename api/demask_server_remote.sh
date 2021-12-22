#!/bin/sh

ID=$1
SEQFILE="working/${ID}.fa"
# BLASTFILE="working/${ID}.blast.json"
ALNFILE="working/${ID}.a2m"
OUTFILE="results/${ID}.txt"

# Can't call find_homologs because I need my local python3:
PYTHONPATH="../demask:$PYTHONPATH" ../local/bin/python3 -m demask.homologs -s $SEQFILE -o $ALNFILE

if [ $? -eq 0 ]
then
    sqlite3 demask.db "UPDATE Scoreset SET homologs=1 WHERE sha1='$ID'"
else
    sqlite3 demask.db "UPDATE Scoreset SET error=1 WHERE sha1='$ID'"
    exit 1
fi

PYTHONPATH="../demask:$PYTHONPATH" ../local/bin/python3 -m demask.predict -i $ALNFILE -o $OUTFILE

if [ $? -eq 0 ]
then
    sqlite3 demask.db "UPDATE Scoreset SET ready=1 WHERE sha1='$ID'"
    sqlite3 demask.db "UPDATE Scoreset SET finished_at=datetime('now') WHERE sha1='$ID'"
else
    sqlite3 demask.db "UPDATE Scoreset SET error=1 WHERE sha1='$ID'"    
fi
