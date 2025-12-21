from fastapi import FastAPI
from database import engine, Base
from routes import auth, document, dialog, query

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HR-Guardian")

app.include_router(auth.router)
app.include_router(document.router)
app.include_router(dialog.router)
app.include_router(query.router)
from routes import rag_callback
app.include_router(rag_callback.router)

@app.get("/")
def root():
    return {"message": "HR Guardian API is running"}