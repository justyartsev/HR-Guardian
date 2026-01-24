import styled from "styled-components"

const StyledButton = styled.button`
    background-color: ${props => {
        if (props?.$variant === "danger") return 'rgba(180, 60, 60, 0.3)';
        if (props?.$variant === "alert") return 'var(--secondary-orange-1)';
        return 'var(--primary-black-2)';
    }};
    font-size: 1.6rem;
    align-items: center;
    flex-wrap: nowrap;
    justify-content: center;
    display: flex;
    border-radius: 12px;
    padding: 1rem 2rem;
    color: ${props => props?.$variant === "danger" ? 'rgba(255, 120, 120, 0.9)' : 'var(--primary-white-1)'};
    border: 1px solid ${props => props?.$variant === "danger" ? 'rgba(180, 60, 60, 0.5)' : 'var(--primasy-stroke-1)'};
    width: auto;
    height: auto;
    transition: all 200ms ease-out;
    font-weight: 500;

    &:hover{
        cursor: pointer;
        background-color: ${props => props?.$variant === "danger" ? 'rgba(180, 60, 60, 0.5)' : 'var(--secondary-orange-1)'};
        border-color: ${props => props?.$variant === "danger" ? 'rgba(180, 60, 60, 0.7)' : 'var(--secondary-orange-1)'};
        transform: translateY(-1px);
        box-shadow: ${props => props?.$variant === "danger" ? '0 4px 12px rgba(180, 60, 60, 0.2)' : '0 4px 12px rgba(255, 152, 0, 0.3)'};
    }
    &:active{
        transform: translateY(0);
        background-color: ${props => props?.$variant === "danger" ? 'rgba(180, 60, 60, 0.6)' : 'var(--secondary-orange-1)'};
    }`

export function Button({children, onClick, variant, ...params}) {
    return <StyledButton {...params} $variant={variant} onClick={onClick}>
        {children}
    </StyledButton>
}