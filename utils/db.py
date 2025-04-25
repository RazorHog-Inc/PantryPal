def initialize_db(firebase):
    db = firebase.database()
    return db

def get_db_reference(db, path):
    return db.child(path)