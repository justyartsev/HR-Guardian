import styled from "styled-components"
import { Button } from "../Button/button"
import { useState } from "react"
import { FiPlus } from "react-icons/fi";
import ContextMenu from "../ContextMenu/contextMenu";

const MainDiv = styled.div`
    display: flex;
    height: 100vh;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: space-between;
    min-width: 175px;
    width: 20%;
    background-color: var(--primary-black-1);
    border: 1px solid var(--primasy-stroke-1);
`

const InnerDiv = styled.div`
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    width: auto;
    justify-content: space-between;
    gap: 1rem;
    padding: 2rem 1rem;
`

const NameDiv = styled.div`
    font-size: 1.6rem;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 1.4rem 0;
    justify-content: space-around;
    color: var(--primary-white-1);
    border-bottom: 1px solid var(--primasy-stroke-1);
    border-top: 1px solid var(--primasy-stroke-1);
    width: auto;
`

export default function SideMenu(){
    const [active, setActive] = useState("chat");
    const [chats, setChats] = useState([]);
    const [username, setUsername] = useState("...");

    function LoadChats() {}

    return <MainDiv>
        <InnerDiv>
            <Button style={{height: '4rem'}} onClick={() => {}}><FiPlus size={"2rem"}/> Новый чат</Button>
            {/* {Генерация кнопок из chats} */}
            <Button style={{height: '4rem', position: "relative"}} onClick={() => {}}>Чат 1 <ContextMenu style={{position:"absolute", right: "1rem", height: "2.5rem"}}/></Button>
        </InnerDiv>
        <div>
        <NameDiv>{username}</NameDiv>
        <InnerDiv>
            <Button name="chat" onClick={(e) => {setActive(e.target.name)}} type={active == "chat" ? "alert" : ""} style={{height: '4rem'}}>Чат-бот</Button>
            <Button name="knowledge" onClick={(e) => {setActive(e.target.name)}} type={active == "knowledge" ? "alert" : ""} style={{height: '4rem'}}>База знаний</Button>
            <Button name="queries" onClick={(e) => {setActive(e.target.name)}} type={active == "queries" ? "alert" : ""} style={{height: '4rem'}}>Журнал запросов</Button>
        </InnerDiv>
        </div>
    </MainDiv>
}

