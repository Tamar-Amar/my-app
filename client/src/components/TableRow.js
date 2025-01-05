export default function TableRow({ symbol }) {
    const [id, name] = symbol;
  
    return (
      <tr className="border-b">
        <td className="px-4 py-2">{id}</td>
        <td className="px-4 py-2">{name}</td>
        <td className="px-4 py-2 text-center">
          <input type="checkbox" name={`weekly_${id}`} className="h-5 w-5" />
        </td>
        <td className="px-4 py-2 text-center">
          <select name={`day_${id}`} className="border rounded-md p-1">
            <option value="">בחר יום</option>
            <option value="ראשון">ראשון</option>
            <option value="שני">שני</option>
            <option value="שלישי">שלישי</option>
            <option value="רביעי">רביעי</option>
            <option value="חמישי">חמישי</option>
          </select>
        </td>
      </tr>
    );
  }
  