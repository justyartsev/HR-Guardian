import styled from "styled-components"

const StyledButton = styled.button`
    background-color: var(${props => props?.$variant == "danger" ? "--secondary-red-1" : props?.$variant == "alert" ? '--secondary-orange-1' : "--primary-black-2"});
    font-size: 1.6rem;
    align-items: center;
    flex-wrap: nowrap;
    justify-content: center;
    display: flex;
    border-radius: 15px;
    color: var(--primary-white-1);
    border: 1px solid var(--primasy-stroke-1);
    width: auto;
    height: auto;
    transition: all 300ms ease-out;
    &:hover{
        cursor: pointer;
        background-color: var(--secondary-orange-1);
    }
    &:active{
        background-color: var(--secondary-red-1);
    }`

export function Button({children, onClick, variant, ...params}) {
    return <StyledButton {...params} $variant={variant} onClick={onClick}>
        {children}
    </StyledButton>
}