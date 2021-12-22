#!/bin/bash

ID=$1
SEQFILE="working/${ID}.fa"
# BLASTFILE="working/${ID}.blast.json"
ALNFILE="working/${ID}.a2m"
OUTFILE="results/${ID}.txt"
POSFILE="pos_rank/${ID}.pos_rank.txt"

python3 -m demask.homologs -s $SEQFILE -o $ALNFILE

if [ $? -eq 0 ]
then
    HITS=$(($(grep -c "^>" working/$ID.a2m)-1))
    sqlite3 demask.db "UPDATE Scoreset SET homologs=1 WHERE sha1='$ID'"
    sqlite3 demask.db "UPDATE Scoreset SET n_homologs=$HITS WHERE sha1='$ID'"
else
    sqlite3 demask.db "UPDATE Scoreset SET error=1 WHERE sha1='$ID'"
    exit 1
fi

python3 -m demask.predict -i $ALNFILE -o $OUTFILE

if [ $? -eq 0 ]
then
    python3 pos_rank.py $OUTFILE $POSFILE
    sqlite3 demask.db "UPDATE Scoreset SET ready=1 WHERE sha1='$ID'"
    sqlite3 demask.db "UPDATE Scoreset SET finished_at=datetime('now') WHERE sha1='$ID'"
else
    sqlite3 demask.db "UPDATE Scoreset SET error=1 WHERE sha1='$ID'"    
fi
