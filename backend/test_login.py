import traceback
try:
    from app.database import SessionLocal
    from app.models import User, AuditLog
    from app.auth import verify_password, create_access_token
    db = SessionLocal()
    user = db.query(User).filter(User.username == 'admin').first()
    if not user or not verify_password('admin123', user.password_hash):
        print('BAD CREDS')
    else:
        user.failed_login_attempts = 0
        db.commit()
        print('Step 1 OK')
        token = create_access_token(data={'sub': user.id, 'role': user.role})
        print('TOKEN:', token[:40])
        entry = AuditLog(action='login_success', details=f'User {user.username} logged in', user_id=user.id, ip_address='127.0.0.1')
        db.add(entry)
        db.commit()
        print('AUDIT OK')
except Exception as e:
    traceback.print_exc()
finally:
    db.close()
