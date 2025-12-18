import styled from "styled-components"
import alertIco from '../../assets/alertMsg.png'

const CustomDiv = styled.div`
background-color: ${props => props.$variant == "input" ? "var(--primary-black-3)" : props.$variant == "output" ? "var(--primary-black-2)" : "var(--secondary-orange-1)" };
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

const MessageWrapper = styled.div`
  display: inline-block;
  text-align: left;
  margin-bottom: 0.5rem;
`

const ReportButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.2rem 0;
  margin-top: 0.3rem;
  transition: all 0.2s ease;
  font-family: inherit;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  
  &:hover {
    color: var(--secondary-red-1);
  }
`

const Exclamation = styled.span`
  color: var(--secondary-red-1);
  font-weight: bold;
  font-size: 1.2rem;
`


export function Message({children, variant, alertMsg, showReportButton = false, onReport}) {
    const handleReportClick = () => {
        if (onReport) {
        onReport(children);
        }
    };
    return( <div style={{textAlign: variant == "input" ? "right" : "left"}}>
        
        <MessageWrapper>
        <CustomDiv $variant={variant}>
          {children}
        </CustomDiv>
        
        {alertMsg && (
          <img 
            src={alertIco} 
            alt="alertImg" 
            style={{
              width: "2rem", 
              paddingLeft: "1rem", 
              paddingRight: "1rem",
              verticalAlign: "middle",
              marginTop: "-0.5rem"
            }} 
            title={alertMsg}
          />
        )}
        
        {/* Кнопка жалобы под сообщением */}
        {variant === "input" && showReportButton && (
          <ReportButton 
            onClick={handleReportClick}
            title="Пожаловаться на сообщение"
            style={{
              marginLeft: "0.5rem"
            }}
          >
            <Exclamation>!</Exclamation>
            <span>Пожаловаться</span>
          </ReportButton>
        )}
      </MessageWrapper>
      </div>
    )
}