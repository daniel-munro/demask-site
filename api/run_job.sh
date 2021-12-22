ID=$1
SEQFILE="/Genomics/demask/data/working/${ID}.fa"
BLASTFILE="/Genomics/demask/data/working/${ID}.blast.json"
ALNFILE="/Genomics/demask/data/working/${ID}.a2m"
OUTFILE="/Genomics/demask/data/results/${ID}.txt"
POSFILE="/Genomics/demask/data/pos_rank/${ID}.pos_rank.txt"
DBFILE="/Genomics/demask/data/demask.db"

/Genomics/demask/local/bin/python3 -m demask.homologs -c demask_config.ini -s $SEQFILE -o $ALNFILE

if [ $? -eq 0 ]
then
    HITS=$(($(grep -c "^>" $ALNFILE)-1))
    sqlite3 $DBFILE "UPDATE Scoreset SET homologs=1 WHERE sha1='$ID'"
    sqlite3 $DBFILE "UPDATE Scoreset SET n_homologs=$HITS WHERE sha1='$ID'"
    rm $BLASTFILE
else
    sqlite3 $DBFILE "UPDATE Scoreset SET error=1 WHERE sha1='$ID'"
    exit 1
fi

/Genomics/demask/local/bin/python3 -m demask.predict -c demask_config.ini -i $ALNFILE -o $OUTFILE

if [ $? -eq 0 ]
then
    /Genomics/demask/local/bin/python3 pos_rank.py $OUTFILE $POSFILE
    sqlite3 $DBFILE "UPDATE Scoreset SET ready=1 WHERE sha1='$ID'"
    sqlite3 $DBFILE "UPDATE Scoreset SET finished_at=datetime('now') WHERE sha1='$ID'"
else
    sqlite3 $DBFILE "UPDATE Scoreset SET error=1 WHERE sha1='$ID'"    
fi
