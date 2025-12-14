import styled from "styled-components"
import { Button } from "../Button/button"
import { useEffect, useState } from "react"
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
    //placeHolder for newChat function
    async function newChat() {
        const response = await fetch();
        return response.ok;
    }

    //placeHolder for loadChats function
    async function loadChats() {
        const response = await fetch();
        return response.ok;
    }

    //placeholder to load chats on component render or dependency change (no deps now)
    useEffect(() => loadChats, [])


    const [active, setActive] = useState("chat");
    const [chats, setChats] = useState([]);
    const [username, setUsername] = useState("...");


    return <MainDiv id="SideMenu">
        <InnerDiv>
            <Button style={{height: '4rem'}} onClick={() => {newChat()}}><FiPlus size={"2rem"}/> Новый чат</Button>
            {/* {Генерация кнопок из chats} */}
            <Button style={{height: '4rem', position: "relative"}} onClick={() => {}}>Чат 1 <ContextMenu id={1}/></Button>
            <Button style={{height: '4rem', position: "relative"}} onClick={() => {}}>Чат 1 <ContextMenu id={2}/></Button>
        </InnerDiv>
        <div>
        <NameDiv>{username}</NameDiv>
        <InnerDiv>
            <Button name="chat" onClick={(e) => {setActive(e.target.name)}} variant={active == "chat" ? "alert" : ""} style={{height: '4rem'}}>Чат-бот</Button>
            <Button name="knowledge" onClick={(e) => {setActive(e.target.name)}} variant={active == "knowledge" ? "alert" : ""} style={{height: '4rem'}}>База знаний</Button>
            <Button name="queries" onClick={(e) => {setActive(e.target.name)}} variant={active == "queries" ? "alert" : ""} style={{height: '4rem'}}>Журнал запросов</Button>
        </InnerDiv>
        </div>
    </MainDiv>
}