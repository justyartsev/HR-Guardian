import styled from "styled-components"
import { FiMoreHorizontal } from "react-icons/fi";
import { Menu, MenuItem} from '@szhsin/react-menu';
import '@szhsin/react-menu/dist/transitions/zoom.css';
import { useCallback } from "react";


const CustomMenu = styled(Menu)`
    .szh-menu{
        z-index: 1000;
    }
    .szh-menu__item--hover{
        text-decoration: underline;
    }
    ul{
        background-color: var(--primary-black-3);
        font-size: 1.6rem;
        border-radius: 0px 15px 15px 15px;
        top: 5rem;
        li{
            padding: 0.5rem 1rem;
            border-bottom: 1px solid var(--primasy-stroke-1);
            white-space: nowrap;
        }
        li:last-of-type{
            border-bottom: 0;
        }
    }
`

// option = {
//     name: "SomeName",
//     function: function,
// }

export default function ContextMenu({id, options, ...params}) {
    const changeName = useCallback(async function(id) {
        const response = await fetch();
        return response.status
        })

    const deleteChat = useCallback(async function(id) {
        const response = await fetch();
        return response.status
        })

    return (
    <CustomMenu menuButton={<FiMoreHorizontal style={{position: "absolute", right: "1rem"}} size={"2.5rem"} />} transition {...params}>
      <MenuItem onClick={() => {changeName(id)}}>Изменить название</MenuItem>
      <MenuItem onClick={() => {deleteChat(id)}}>Удалить</MenuItem>
    </CustomMenu>
  )
}