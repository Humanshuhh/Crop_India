from backend.database.firebase import get_firestore_db

def seed_admin_user():
    db = get_firestore_db()
    if db:
        admin_data = {
            "name": "Dr. Ananya Sharma",
            "email": "admin@cropindia.gov.in",
            "password": "Admin@123",
            "role": "admin",
            "assigned_zone": "Eastern Plateau and Hills Region",
            "designation": "Chief Extension Agronomist"
        }
        # Save under document ID 'admin@cropindia.gov.in'
        db.collection("admins").document("admin@cropindia.gov.in").set(admin_data)
        print("Admin user successfully seeded into Firestore collection 'admins'!")
    else:
        print("Failed to connect to Firestore.")

if __name__ == "__main__":
    seed_admin_user()