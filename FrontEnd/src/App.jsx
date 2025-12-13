import { Button } from './components/Button/button.jsx'
import { Message } from './components/Message/message.jsx'
import { Input } from './components/input/Input.jsx'
import { Table } from "./components/Table/Table";

const mockDocuments = [
  { 
    name: "Регламент об отпускных днях", 
    date: "21.06.2025", 
    owner: "Петров Петр Петрович" 
  },
  { 
    name: "Правила внутреннего распорядка", 
    date: "15.06.2025", 
    owner: "Иванова Мария Сергеевна" 
  },
];

const mockComplaints = [
  { 
    name: "Жалоба №124", 
    date: "20.06.2025", 
    user: "Сидоров Алексей" 
  },
  { 
    name: "Жалоба №125", 
    date: "18.06.2025", 
    user: "Кузнецова Анна" 
  },
];

function App() {
  const handleEdit = (item) => {
    console.log("Редактировать:", item);
  };

  const handleDelete = (item) => {
    console.log("Удалить:", item);
  };


  return (
    <div style={{backgroundColor: "darkblue"}}>
      <Button style={{width: "400px", minHeight: "50px"}} >qweqwewqwe</Button>
      <Input 
        placeholder="Спросите что-нибудь..."
        style={{ width: "400px", marginBottom: "20px" }}
      />
      <Message type={"output"} alertMsg="weqiuryjbdsfudsiyarweagjguh">loremas dqwewqeqweq wewqeqwe  qwe qweqw32reawafasd asdwe qweqweqwedsaq weqweqwe qweqwsadeqwe gjkysadd siugusidfhgaj kdhbeuw iraghtriul</Message>
      <Message type={"input"}>asdasds</Message>
      {/* Таблица документов */}
      <div style={{ marginBottom: "40px" }}>
        <h2 style={{ 
          color: "white", 
          marginBottom: "20px", 
          fontSize: "1.8rem" 
        }}>
          Документы
        </h2>
        <Table 
          data={mockDocuments}
          type="documents"
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Таблица жалоб */}
      <div>
        <h2 style={{ 
          color: "white", 
          marginBottom: "20px", 
          fontSize: "1.8rem" 
        }}>
          Жалобы
        </h2>
        <Table 
          data={mockComplaints}
          type="complaints"
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}

export default App
