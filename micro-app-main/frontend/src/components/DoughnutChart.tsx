import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DoughnutChartProps {
  data: any;
  options: any;
  onError?: () => void;
}

function DoughnutChart({ data, options, onError }: DoughnutChartProps) {
  return (
    <div className="h-full w-full">
      <Doughnut 
        data={data} 
        options={options}
        onError={onError}
      />
    </div>
  );
}

export default DoughnutChart; 