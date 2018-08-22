import PowerScheduler from './PowerScheduler';

export default function run (inputData) {
  const powerScheduler = new PowerScheduler(inputData);
  return powerScheduler.bruteForce2();
}
