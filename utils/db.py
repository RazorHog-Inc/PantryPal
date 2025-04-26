DISCORD_BOT_TOKEN='ABF1MTY1OTMwMDI1ODU3ODU0Mg.G8ZRUN.b_j4wyFzs8_37PBLrLNqZ5O8Baf9tcvgV4qwrt'

def initialize_db(firebase):
    db = firebase.database()
    return db

def get_db_reference(db, path):
    return db.child(path)