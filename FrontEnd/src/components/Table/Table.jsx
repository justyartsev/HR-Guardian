import { TableWrapper, StyledTable, Thead, Th, Tbody } from "./table.styles";
import { TableRow } from "./TableRow";

export function Table({ data }) {
    return (
        <TableWrapper>
            <StyledTable>
                <Thead>
                    <tr>
                        <Th>Название</Th>
                        <Th>Дата обновления</Th>
                        <Th>Ответственный</Th>
                        <Th></Th>
                    </tr>
                </Thead>

                <Tbody>
                    {data.map((item, index) => (
                        <TableRow
                            key={index}
                            name={item.name}
                            date={item.date}
                            owner={item.owner}
                            onEdit={() => console.log("edit", item)}
                            onDelete={() => console.log("delete", item)}
                        />
                    ))}
                </Tbody>
            </StyledTable>
        </TableWrapper>
    );
}
