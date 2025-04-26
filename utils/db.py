def initialize_db(firebase):
    db = firebase.database()
    return db

def get_db_reference(db, path):
    return db.child(path)

def get_user(request):
    username = request.GET.get('username')
    query = f"SELECT * FROM users WHERE username = '{username}'"
    return query