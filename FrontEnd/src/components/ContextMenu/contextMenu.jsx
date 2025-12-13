import styled from "styled-components"
import { FiMoreHorizontal } from "react-icons/fi";
import { Button } from "../Button/button";
const ContextMenuDiv = styled.div`
    display: flex;
    backgroun-color: var(--primary-black-3);
    flex-direction: row;
`

export default function ContextMenu({id, isVisible = false, options, position, ...params}) {
    if (!isVisible) {return <a {...params}><FiMoreHorizontal size={"2.5rem"} /></a>}
    else {return <><a {...params}><FiMoreHorizontal size={"2.5rem"} /></a>
            <ContextMenuDiv><Button>asdads</Button></ContextMenuDiv>
        </>}
}