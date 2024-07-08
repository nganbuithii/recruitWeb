import { UpdateUserDto } from './dto/update-user.dto';
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { genSaltSync, hashSync, compareSync } from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { CreateUserDto, RegisterUserDto } from './dto/create-user.dto';
import { CurrentUser } from '@/decorator/customizes';
import { IUser } from '@/interfaces/user.interface';


@Injectable()
export class UsersService implements OnModuleInit {

  constructor(
    @InjectModel(User.name)
    //  để có thể xóa mềm được thêm kiểu SoftDelete
    private userModel: SoftDeleteModel<UserDocument>,
    private configService: ConfigService
  ) { }

  async onModuleInit() {
    const count = await this.userModel.count();
    if (count === 0) {
      const salt = genSaltSync(10);
      const hash = hashSync(this.configService.get<string>("INIT_USER_PASSWORD"), salt);
      await this.userModel.insertMany([
        {
          name: "Eric",
          email: "admin@gmail.com",
          password: hash
        },
        {
          name: "User",
          email: "user@gmail.com",
          password: hash
        },
        {
          name: "User 1",
          email: "user1@gmail.com",
          password: hash
        },
        {
          name: "User 2",
          email: "user2@gmail.com",
          password: hash
        },
        {
          name: "User 3",
          email: "user3@gmail.com",
          password: hash
        }
      ])
    }
  }


  async findAll() {
    return await this.userModel.find({});
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email });
  }

  checkPassword(hash: string, plain: string) {
    return compareSync(hash, plain);
  }

  findOne(id:string){
    if(!mongoose.Types.ObjectId.isValid(id))
      return 'not found user'
    return this.userModel.findOne({
      _id:id
    })
  }
  findOneByUsername(username:string){
   
    return this.userModel.findOne({
      email:username
    })
  }
  checkUserPassword(password:string, hash:string){
    return compareSync(password, hash);
    // sẽ trả ra true hoặc false
  }

  async remove(id:string, user:IUser){
    if(!mongoose.Types.ObjectId.isValid(id))
      return 'not found user'
    // để xóa mềm gọi soft delete
    await this.userModel.updateOne(
      {_id:id},
      {deletedBy:{
        _id:user._id,
        email:user.email
      }}
    )
    return this.userModel.softDelete
    ({
      _id:id
    })
  }

  async register(user: RegisterUserDto) {
    const {name, email, password, age,  address} = user;
    // check logic email đã tồn tại chưa
    const isExist = await this.userModel.findOne({email: email});
    if(isExist){
      throw new BadRequestException(`Email đã tồn tại ${email}`);
    }
    const salt = genSaltSync(10);
    const hashedPassword = hashSync(user.password, salt);
    const newUser =await this.userModel.create({
      name, email,
      password:hashedPassword,
      age, 
      role:'USER'
    })
    return newUser;
  }
  async create(createUser: CreateUserDto, @CurrentUser() user: IUser) {
    const { name, email, password, company, age, address } = createUser;
    
    // Kiểm tra xem email đã tồn tại chưa
    const isExist = await this.userModel.findOne({ email: email });
    if (isExist) {
      throw new BadRequestException(`Email đã tồn tại ${email}`);
    }
  
    const salt = genSaltSync(10);
    const hashedPassword = hashSync(password, salt);
  
    const newUser = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
      age,
      role: 'USER',
      company: {
        _id: company._id,
        name: company.name,
      },
      createdBy: {
        _id: user._id,
        email: user.email,
      },
      createdDate: new Date(), // Thêm createdDate vào đây nếu cần
    });
  
    return newUser;
  }
  

  async update(userUpdate:UpdateUserDto, user: IUser){
    const updated = await this.userModel.updateOne(
      {
        _id:userUpdate._id
      },{
        ...userUpdate,
        updatefBy:{
          _id:user._id,
          email:user.email
        }
      }
    )
    return updated;
  }
}
