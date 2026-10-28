import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatBytes } from '../../utils/format'

export default function StorageDonut({ data, ariaLabel }) {
  return <ResponsiveContainer width="100%" height="100%">
    <PieChart aria-label={ariaLabel}>
      <Pie data={data} dataKey="bytes" nameKey="label" innerRadius="67%" outerRadius="94%" paddingAngle={data.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}>
        {data.map((slice) => <Cell key={slice.key} fill={slice.color} />)}
      </Pie>
      <Tooltip
        formatter={(bytes, label) => [`${formatBytes(bytes)}`, label]}
        contentStyle={{ border: '1px solid #e2e8e2', borderRadius: 6, fontSize: 10, fontFamily: 'Manrope, sans-serif' }}
      />
    </PieChart>
  </ResponsiveContainer>
}
