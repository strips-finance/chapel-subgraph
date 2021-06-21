import fs from 'fs';
import glob from 'glob';
import handlebars from 'handlebars';
import moment from 'moment';
import path from 'path';
import yargs from 'yargs';
import localNetwork from './deployments/local.json';
import chapelTestnet from './deployments/chapel.json';

interface Deployment {
    // Core
    stripsAddress: string;
    insuranceAddress: string;
}
    
interface DeploymentWithMetadata extends Deployment {
    networkName: string;
    startBlock: number;
}

async function fetchDeployment(source: string): Promise<DeploymentWithMetadata> { 
    if (source === 'local') {
      return {
        networkName: 'mainnet',
        startBlock: 1,
  
        // Core
        stripsAddress: localNetwork.contracts.Strips.address,
        insuranceAddress: localNetwork.contracts.InsurancePool.address,
      };
    }

    if (source === 'chapel') {
        return {
          networkName: 'chapel',
          startBlock: chapelTestnet.startBlock,
    
          // Core
          stripsAddress: chapelTestnet.contracts.Strips.address,
          insuranceAddress: chapelTestnet.contracts.InsurancePool.address,
        };
    }


    throw new Error('Unsupported deployment');
}

yargs
  .command('flatten', 'Flatten the generated code.', () => {
    const generated = path.resolve(__dirname, '..', 'src', 'generated');
    const globbed = glob.sync('**/*', { cwd: path.join(generated) });
    const files = globbed.filter((item) => {
      const stats = fs.statSync(path.join(generated, item));
      return stats.isFile();
    });

    const directories = globbed.filter((item) => {
      const stats = fs.statSync(path.join(generated, item));
      return stats.isDirectory();
    });

    files.forEach((item) => {
      const from = path.join(generated, item);
      const to = path.join(generated, path.basename(item));
      fs.renameSync(from, to);
    });

    directories.forEach((item) => {
      fs.rmdirSync(path.join(generated, item), { recursive: true });
    });
  })
  .command(
    'template',
    'Generate files from templates using the deployment addresses.',
    (yargs) => {
      return yargs.option('deployment', {
        type: 'string',
        default: 'mainnet',
      });
    },
    async (args) => {
      const deploymentJson = await fetchDeployment(args.deployment);

      {
        console.log('Generating subgraph manifest');

        const templateFile = path.join(__dirname, '../templates/subgraph.yml');
        const outputFile = path.join(__dirname, '../subgraph.yaml');
        const templateContent = fs.readFileSync(templateFile, 'utf8');

        const compile = handlebars.compile(templateContent);
        const replaced = compile(deploymentJson);

        fs.writeFileSync(outputFile, replaced);
      }

      {
        console.log('Generating static address map');

        const templateFile = path.join(__dirname, '../templates/addresses.ts');
        const outputFile = path.join(__dirname, '../src/addresses.ts');
        const templateContent = fs.readFileSync(templateFile, 'utf8');

        const compile = handlebars.compile(templateContent);
        const replaced = compile(deploymentJson);

        fs.writeFileSync(outputFile, replaced);
      }

      {
        console.log('Generating timestamps for month starts');

        const initial = moment.utc('2020-11-01T00:00:00.000Z').startOf('month').startOf('day');
        const timestamps = Array(100)
          .fill(null)
          .map((_, index) => initial.clone().add(index, 'month').startOf('month').startOf('day'));

        const data = {
          months: timestamps.map((timestamp) => ({ start: timestamp.unix() })),
        };

        const templateFile = path.join(__dirname, '../templates/months.ts');
        const outpufile = path.join(__dirname, '../src/months.ts');
        const templateContent = fs.readFileSync(templateFile, 'utf8');

        const compile = handlebars.compile(templateContent);
        const replaced = compile(data);

        fs.writeFileSync(outpufile, replaced);
      }
    },
  )
  .help().argv;