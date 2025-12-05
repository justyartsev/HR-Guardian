from fastapi import FastAPI
import models
from database import engine
from routes import auth,document,dialog

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="HR-Guardian")

app.include_router(auth.router)
app.include_router(document.router)
app.include_router(dialog.router)

@app.get("/")
def root():
    return {"message": "HR Guardian API is running"}