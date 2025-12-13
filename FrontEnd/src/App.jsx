import { Button } from './components/Button/button.jsx'
import { Message } from './components/Message/message.jsx'
import { Input } from './components/input/Input.jsx'
import { Table } from "./components/Table/Table";

const mockData = [
  {
    name: "Регламент об отпускных днях",
    date: "21.06.2025",
    owner: "Петров Петр Петрович",
  },
  {
    name: "Регламент об отпускных днях",
    date: "21.06.2025",
    owner: "Петров Петр Петрович",
  },
];

function App() {
  

  return (
    <div style={{backgroundColor: "darkblue"}}>
      <Button style={{width: "400px", minHeight: "50px"}} >qweqwewqwe</Button>
      <Input 
        placeholder="Спросите что-нибудь..."
        style={{ width: "400px", marginBottom: "20px" }}
      />
      <Message type={"output"} alertMsg="weqiuryjbdsfudsiyarweagjguh">loremas dqwewqeqweq wewqeqwe  qwe qweqw32reawafasd asdwe qweqweqwedsaq weqweqwe qweqwsadeqwe gjkysadd siugusidfhgaj kdhbeuw iraghtriul</Message>
      <Message type={"input"}>asdasds</Message>
      <div style={{ backgroundColor: "darkblue", padding: "40px" }}>
        <Table data={mockData} />
      </div>
    </div>
  )
}

export default App
