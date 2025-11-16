import styled from "styled-components"
import alertIco from '../../assets/alertMsg.png'

const CustomDiv = styled.div`
background-color: ${props => props.type == "input" ? "var(--primary-black-3)" : props.type == "output" ? "var(--primary-black-2)" : "var(--secondary-orange-1)" };
color: var(--primary-white-1);
padding: 2rem;
font-size: 1.6rem;
border-radius: 20px;
padding: 1rem 2rem 1rem 2rem;
display: inline-flex;
align-items: center;
flex-wrap: wrap;
text-align: left;
justify-content: flex-start;
`

export function Message({children, type, alertMsg}) {
    return <div style={{textAlign: type == "input" ? "right" : "left"}}>
    <CustomDiv type={type}>{children}</CustomDiv><br/>
    {alertMsg && <img src={alertIco} alt="alertImg" style={{width: "2rem", paddingLeft: "1rem", paddingRight: "1rem"}} title={alertMsg}/>}
    </div>
}