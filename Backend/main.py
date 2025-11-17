from fastapi import FastAPI
import models
from database import engine
from routes import auth

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="HR-Guardian")

app.include_router(auth.router)
